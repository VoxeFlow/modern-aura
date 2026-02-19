import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatList from './components/ChatList';
import ChatArea from './components/ChatArea';
import ConfigModal from './components/ConfigModal';
import ConnectModal from './components/ConnectModal';
import BriefingModal from './components/BriefingModal';
import HistoryView from './components/HistoryView';
import CRMView from './components/CRMView';
import LoginScreen from './components/LoginScreen';
import OwnerView from './components/OwnerView';
import { useStore } from './store/useStore';
import WhatsAppService from './services/whatsapp';
import { useKnowledgeLoop } from './hooks/useKnowledgeLoop';
import { isSupabaseEnabled, supabase } from './services/supabase';
import { claimUserSession, heartbeatUserSession, releaseUserSession } from './services/sessionLock';
import { resolveTenantContext } from './services/tenant';
import { loadTenantSettings, upsertTenantSettings } from './services/tenantSettings';
import {
  ensureDefaultTenantChannel,
  isScopedInstanceName,
  loadLeadTagMap,
  loadConversationSummaries,
  loadCrmStagesAsTags,
  loadTenantChannels,
  mapChannelsToStore,
  normalizeTenantChannelsScope,
  persistChatsSnapshot,
  upsertTenantChannel,
} from './services/tenantData';

const App = () => {
  const MAX_VISIBLE_CHATS = 220;
  const MAX_PERSISTED_CHATS = 120;
  const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  useKnowledgeLoop(); // AURA v11: Dynamic Knowledge Loop
  const {
    setIsConnected,
    currentView,
    setChats,
    activeChat,
    setActiveChat,
    setSubscriptionPlan,
    hasFeature,
    switchView,
    getActiveWhatsAppChannel,
    setConfig,
    updateWhatsAppChannel,
    whatsappChannels,
    setWhatsAppChannelStatus,
    setAuthIdentity,
    applyTenantContext,
    setWhatsAppChannels,
    setTags,
    setChatTags,
    setKnowledgeBase,
    tenantId,
    tenantName,
    briefing,
    knowledgeBase,
    resetBrain,
  } = useStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // AUTH: Check if user is authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [tenantBootstrapReady, setTenantBootstrapReady] = useState(false);
  const [tenantOnboardingCompleted, setTenantOnboardingCompleted] = useState(true);
  const [envFatal, setEnvFatal] = useState('');
  const [sessionGuardError, setSessionGuardError] = useState('');
  const channelsRef = useRef([]);
  const pollInFlightRef = useRef(false);
  const lastChatsSignatureRef = useRef('');
  const lastSnapshotAtRef = useRef(0);

  // AUTH: Check Supabase session (preferred) or local legacy token fallback.
  useEffect(() => {
    let mounted = true;

    const checkLegacyToken = () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return false;

      try {
        const decoded = atob(token);
        const parsed = JSON.parse(decoded);
        const validType = parsed?.type === 'authenticated';
        const notExpired = typeof parsed?.expiresAt === 'number' && parsed.expiresAt > Date.now();

        if (validType && notExpired) return true;
        localStorage.removeItem('auth_token');
        return false;
      } catch {
        localStorage.removeItem('auth_token');
        return false;
      }
    };

    const checkAuth = async () => {
      if (!isLocalhost && !isSupabaseEnabled) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('aura_master_mode');
        localStorage.removeItem('aura_tenant_id');
        if (mounted) {
          setIsAuthenticated(false);
          setAuthReady(true);
          setEnvFatal('Configuração obrigatória ausente no ambiente online: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
        }
        return;
      }

      let authed = false;
      if (isSupabaseEnabled) {
        const { data } = await supabase.auth.getSession();
        authed = Boolean(data?.session);
        if (!isLocalhost) {
          localStorage.removeItem('auth_token');
        }
      }
      if (!authed && !isSupabaseEnabled) authed = checkLegacyToken();
      if (mounted) {
        setIsAuthenticated(authed);
        setAuthReady(true);
      }
    };

    checkAuth();

    const authListener = isSupabaseEnabled
      ? supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        if (session) {
          setIsAuthenticated(true);
          setAuthReady(true);
        } else {
          const legacyAuthed = !isSupabaseEnabled ? checkLegacyToken() : false;
          setIsAuthenticated(legacyAuthed);
          setAuthReady(true);
        }
      })
      : null;

    const onStorage = () => checkAuth();
    window.addEventListener('storage', onStorage);

    return () => {
      mounted = false;
      window.removeEventListener('storage', onStorage);
      authListener?.data?.subscription?.unsubscribe?.();
    };
  }, [isLocalhost]);

  // LEAD PROCESSING: Check for pending leads from Landing Page
  useEffect(() => {
    if (isAuthenticated && tenantBootstrapReady) {
      const pendingLead = localStorage.getItem('aura_pending_lead');
      if (pendingLead) {
        try {
          const leadData = JSON.parse(pendingLead);
          console.log('AURA: Processing pending lead', leadData);
          const isMasterMode = localStorage.getItem('aura_master_mode') === '1';
          if (isMasterMode && leadData?.plan) {
            setSubscriptionPlan(leadData.plan);
            localStorage.setItem('aura_subscription_plan', leadData.plan);
          }
          useStore.getState().addLead(leadData);
          if (hasFeature('crm_basic')) {
            switchView('crm'); // Go to CRM to see the new lead
          }
          localStorage.removeItem('aura_pending_lead');
        } catch (e) {
          console.error('AURA: Failed to process pending lead', e);
        }
      }
    }
  }, [isAuthenticated, tenantBootstrapReady, hasFeature, setSubscriptionPlan, switchView]);

  // TENANT BOOTSTRAP: resolve active workspace for current authenticated user.
  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    if (envFatal) return;
    let cancelled = false;
    setTenantBootstrapReady(false);

    const bootstrapTenant = async () => {
      try {
        if (!isSupabaseEnabled) {
          if (!isLocalhost) {
            setEnvFatal('Ambiente online sem Supabase configurado. Acesse Settings > Environment Variables no Cloudflare Pages.');
            return;
          }
          setAuthIdentity({ userId: null, userEmail: 'legacy@local' });
          applyTenantContext({
            tenantId: 'legacy-local',
            tenantName: 'Workspace Local',
            tenantSlug: 'legacy-local',
            tenantPlan: 'pro',
            tenants: [{ id: 'legacy-local', name: 'Workspace Local', slug: 'legacy-local', role: 'owner' }],
          });
          return;
        }

        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user || null;
        if (!user || cancelled) return;
        // Do not trust browser-local preferred tenant for SaaS sessions.
        // Selection must be deterministic and equal across devices.
        const tenantCtx = await resolveTenantContext({ user, preferredTenantId: null });
        if (cancelled) return;
        const preBootstrapState = useStore.getState();

        setAuthIdentity({ userId: user.id, userEmail: user.email || '' });
        applyTenantContext(tenantCtx);
        setSubscriptionPlan(tenantCtx.tenantPlan || 'pro');
        if (tenantCtx?.tenantId) {
          let onboardingDoneForTenant = true;
          localStorage.setItem('aura_tenant_id', tenantCtx.tenantId);

          try {
            let tenantSettings = await loadTenantSettings(tenantCtx.tenantId);
            // Security rule: never seed tenant data from local browser state in online SaaS mode.
            // Local seeding is allowed only for localhost development convenience.
            const allowLocalSeed = isLocalhost;
            const seedBriefing = allowLocalSeed ? String(preBootstrapState?.briefing || '') : '';
            const seedKnowledgeBase = allowLocalSeed && Array.isArray(preBootstrapState?.knowledgeBase) ? preBootstrapState.knowledgeBase : [];
            const seedManagerPhone = allowLocalSeed ? String(preBootstrapState?.managerPhone || '') : '';
            const seedApiUrl = allowLocalSeed ? String(preBootstrapState?.apiUrl || '') : '';
            const seedApiKey = allowLocalSeed ? String(preBootstrapState?.apiKey || '') : '';
            const hasSeedBusinessData =
              Boolean(seedBriefing.trim()) ||
              seedKnowledgeBase.length > 0 ||
              Boolean(seedManagerPhone.trim());
            const hasSeedInfraData = Boolean(seedApiUrl.trim()) || Boolean(seedApiKey.trim());

            const remoteBusinessDataExists =
              Boolean(String(tenantSettings?.briefing || '').trim()) ||
              (Array.isArray(tenantSettings?.knowledgeBase) && tenantSettings.knowledgeBase.length > 0) ||
              Boolean(String(tenantSettings?.managerPhone || '').trim());
            const remoteInfraDataExists =
              Boolean(String(tenantSettings?.apiUrl || '').trim()) ||
              Boolean(String(tenantSettings?.apiKey || '').trim());

            const nextPatch = {};
            if (hasSeedBusinessData && !remoteBusinessDataExists) {
              if (seedBriefing.trim()) nextPatch.briefing = seedBriefing;
              if (seedKnowledgeBase.length > 0) nextPatch.knowledgeBase = seedKnowledgeBase;
              if (seedManagerPhone.trim()) nextPatch.managerPhone = seedManagerPhone;
            }
            if (hasSeedInfraData && !remoteInfraDataExists) {
              if (seedApiUrl.trim()) nextPatch.apiUrl = seedApiUrl;
              if (seedApiKey.trim()) nextPatch.apiKey = seedApiKey;
            }
            if (
              !tenantSettings?.onboardingCompleted &&
              (
                (remoteBusinessDataExists || hasSeedBusinessData) ||
                Boolean(seedBriefing.trim()) ||
                seedKnowledgeBase.length > 0 ||
                Boolean(seedManagerPhone.trim())
              )
            ) {
              nextPatch.onboardingCompleted = true;
            }

            if (Object.keys(nextPatch).length > 0) {
              await upsertTenantSettings({
                tenantId: tenantCtx.tenantId,
                userId: user.id,
                patch: nextPatch,
              });
              tenantSettings = await loadTenantSettings(tenantCtx.tenantId);
            }
            const remoteBriefing = String(tenantSettings?.briefing || '');
            const remoteKnowledgeBase = Array.isArray(tenantSettings?.knowledgeBase) ? tenantSettings.knowledgeBase : [];
            const remoteManagerPhone = String(tenantSettings?.managerPhone || '');
            const remoteApiUrl = String(tenantSettings?.apiUrl || '');
            const remoteApiKey = String(tenantSettings?.apiKey || '');

            setKnowledgeBase(remoteKnowledgeBase);
            setConfig({
              briefing: remoteBriefing,
              managerPhone: remoteManagerPhone,
              ...(remoteApiUrl ? { apiUrl: remoteApiUrl } : {}),
              ...(remoteApiKey ? { apiKey: remoteApiKey } : {}),
            });

            const hasTenantData = Boolean(remoteBriefing.trim()) || remoteKnowledgeBase.length > 0 || Boolean(remoteManagerPhone.trim());
            const onboardingDone = Boolean(tenantSettings?.onboardingCompleted) || hasTenantData;
            onboardingDoneForTenant = onboardingDone;
            if (hasTenantData && !tenantSettings?.onboardingCompleted) {
              await upsertTenantSettings({
                tenantId: tenantCtx.tenantId,
                userId: user.id,
                patch: { onboardingCompleted: true },
              });
            }
            if (!cancelled) {
              setTenantOnboardingCompleted(onboardingDone);
            }
          } catch (error) {
            console.error('AURA tenant settings bootstrap failed', error);
            if (!cancelled) {
              setKnowledgeBase([]);
              setConfig({ briefing: '', managerPhone: '' });
              setTenantOnboardingCompleted(false);
              onboardingDoneForTenant = false;
            }
          }

          try {
            let channelRows = await ensureDefaultTenantChannel({
              tenantId: tenantCtx.tenantId,
              userId: user.id,
            });

            const localSeedChannels = (Array.isArray(preBootstrapState?.whatsappChannels) ? preBootstrapState.whatsappChannels : [])
              .filter((channel) => String(channel?.instanceName || '').trim().length > 0)
              .map((channel) => ({
                label: String(channel?.label || 'Canal').trim() || 'Canal',
                instanceName: String(channel?.instanceName || '').trim(),
              }));
            if (localSeedChannels.length > 0) {
              const remoteInstanceSet = new Set(
                (channelRows || [])
                  .map((row) => String(row?.instance_name || '').trim().toLowerCase())
                  .filter(Boolean)
              );

              for (const seedChannel of localSeedChannels) {
                const seedInstance = String(seedChannel.instanceName || '').trim().toLowerCase();
                if (!seedInstance || remoteInstanceSet.has(seedInstance)) continue;
                await upsertTenantChannel({
                  tenantId: tenantCtx.tenantId,
                  userId: user.id,
                  channel: seedChannel,
                });
              }
              channelRows = await loadTenantChannels(tenantCtx.tenantId);
            }

            channelRows = await normalizeTenantChannelsScope({
              tenantId: tenantCtx.tenantId,
              tenantSlug: tenantCtx.tenantSlug,
            });
            if (!cancelled) {
              setWhatsAppChannels(mapChannelsToStore(channelRows));
            }
          } catch (error) {
            console.error('AURA channel bootstrap failed', error);
          }

          try {
            const stageTags = await loadCrmStagesAsTags(tenantCtx.tenantId);
            if (!cancelled && Array.isArray(stageTags) && stageTags.length > 0) {
              setTags(stageTags);
            }
          } catch (error) {
            console.error('AURA crm bootstrap failed', error);
          }

          try {
            const summaryChats = await loadConversationSummaries(tenantCtx.tenantId);
            if (!cancelled && Array.isArray(summaryChats)) {
              setChats(summaryChats);
            }
          } catch (error) {
            console.error('AURA inbox bootstrap failed', error);
          }

          try {
            const leadMap = await loadLeadTagMap(tenantCtx.tenantId);
            if (!cancelled) {
              setChatTags(leadMap);
            }
          } catch (error) {
            console.error('AURA crm lead map bootstrap failed', error);
          }

          if (!cancelled) {
            const needsFirstSetup = !onboardingDoneForTenant;
            if (needsFirstSetup) {
              // Only reset for truly first setup (tenant-level), not per device.
              resetBrain();
            }
            setShowWelcome(needsFirstSetup);
          }
        }
      } catch (error) {
        console.error('AURA: tenant bootstrap failed', error);
        if (!cancelled) {
          setEnvFatal(`Falha ao inicializar o tenant deste usuário. Detalhe: ${error?.message || 'erro desconhecido'}`);
        }
      } finally {
        if (!cancelled) {
          setTenantBootstrapReady(true);
        }
      }
    };

    bootstrapTenant();
    return () => { cancelled = true; };
  }, [authReady, isAuthenticated, setAuthIdentity, applyTenantContext, setSubscriptionPlan, setWhatsAppChannels, setTags, setChats, setChatTags, setKnowledgeBase, setConfig, resetBrain, envFatal, isLocalhost]);

  useEffect(() => {
    if (!isAuthenticated) {
      setTenantBootstrapReady(false);
      setTenantOnboardingCompleted(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    channelsRef.current = Array.isArray(whatsappChannels) ? whatsappChannels : [];
  }, [whatsappChannels]);

  // PLAN GUARD: Lite has no CRM
  useEffect(() => {
    if (currentView === 'crm' && !hasFeature('crm_basic')) {
      switchView('dashboard');
    }
  }, [currentView, hasFeature, switchView]);

  // ONBOARDING SAFETY: if tenant is clean and onboarding not marked, force welcome modal.
  useEffect(() => {
    if (!isAuthenticated || !tenantId || !tenantBootstrapReady) return;
    const hasBriefing = Boolean(String(briefing || '').trim());
    const hasKnowledge = Array.isArray(knowledgeBase) && knowledgeBase.length > 0;
    if (!tenantOnboardingCompleted && !hasBriefing && !hasKnowledge) {
      const timer = window.setTimeout(() => {
        setShowWelcome(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [isAuthenticated, tenantId, tenantBootstrapReady, briefing, knowledgeBase, tenantOnboardingCompleted]);

  // CHANNEL SYNC: keep instanceName aligned with selected channel after hydration/login.
  useEffect(() => {
    const activeChannel = getActiveWhatsAppChannel();
    if (activeChannel) {
      if (String(activeChannel.instanceName || '').toLowerCase() === 'voxeflow') {
        updateWhatsAppChannel(activeChannel.id, { instanceName: '' });
        setConfig({ instanceName: '' });
        return;
      }
    }
    if (activeChannel?.instanceName) {
      setConfig({ instanceName: activeChannel.instanceName });
    }
  }, [getActiveWhatsAppChannel, setConfig, updateWhatsAppChannel]);

  // Handle external modal triggers (from Hub/Settings)
  useEffect(() => {
    const handleOpenBriefing = () => setIsBriefingOpen(true);
    const handleOpenConnect = () => setIsConnectOpen(true);

    window.addEventListener('open-briefing', handleOpenBriefing);
    window.addEventListener('open-connect', handleOpenConnect);

    return () => {
      window.removeEventListener('open-briefing', handleOpenBriefing);
      window.removeEventListener('open-connect', handleOpenConnect);
    };
  }, []);


  // Check WhatsApp connection status (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated || !tenantBootstrapReady) return;
    let pollCount = 0;

    const channelsAreEqual = (a = [], b = []) => {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i += 1) {
        const left = a[i] || {};
        const right = b[i] || {};
        if (
          String(left.id || '') !== String(right.id || '')
          || String(left.label || '') !== String(right.label || '')
          || String(left.instanceName || '') !== String(right.instanceName || '')
        ) {
          return false;
        }
      }
      return true;
    };

    const buildChatsSignature = (list = []) => {
      return (Array.isArray(list) ? list : [])
        .slice(0, 120)
        .map((chat) => {
          const id = String(chat?.chatKey || chat?.id || chat?.remoteJid || chat?.jid || '');
          const ts = Number(chat?.lastMessage?.messageTimestamp || chat?.messageTimestamp || chat?.conversationTimestamp || 0);
          return `${id}:${ts}`;
        })
        .join('|');
    };

    const checkConn = async ({ force = false } = {}) => {
      if (!force && document.hidden) return;
      if (pollInFlightRef.current) return;

      pollInFlightRef.current = true;
      pollCount += 1;
      const tenantSlug = useStore.getState().tenantSlug;
      let channels = Array.isArray(channelsRef.current) ? channelsRef.current : [];
      if (tenantId && (force || pollCount % 4 === 1)) {
        try {
          const remoteChannels = await loadTenantChannels(tenantId);
          const mapped = mapChannelsToStore(remoteChannels);
          if (Array.isArray(mapped) && mapped.length > 0 && !channelsAreEqual(mapped, channels)) {
            setWhatsAppChannels(mapped);
            channels = mapped;
            channelsRef.current = mapped;
          }
        } catch (error) {
          console.error('AURA channel refresh error:', error);
        }
      }
      const connectedChannels = channels.filter((channel) => {
        const instance = String(channel.instanceName || '').trim();
        if (!instance) return false;
        return isScopedInstanceName(tenantSlug, instance);
      });

      if (connectedChannels.length === 0) {
        setIsConnected(false);
        setChats([]);
        lastChatsSignatureRef.current = '';
        return;
      }

      const statusRows = await Promise.all(
        connectedChannels.map(async (channel) => {
          const connectionState = await WhatsAppService.checkConnection(channel.instanceName);
          const currentStatus = useStore.getState().whatsappChannelStatus?.[channel.id] || 'disconnected';
          if (currentStatus !== connectionState) {
            setWhatsAppChannelStatus(channel.id, connectionState);
          }
          return { channel, connectionState };
        })
      );

      const openRows = statusRows.filter((row) => row.connectionState === 'open');
      setIsConnected(openRows.length > 0);

      if (openRows.length === 0) {
        if (tenantId) {
          try {
            const summaryChats = await loadConversationSummaries(tenantId);
            const next = Array.isArray(summaryChats) ? summaryChats : [];
            const signature = buildChatsSignature(next);
            if (signature !== lastChatsSignatureRef.current) {
              setChats(next);
              lastChatsSignatureRef.current = signature;
            }
          } catch (error) {
            console.error('AURA: offline inbox load error', error);
            setChats([]);
            lastChatsSignatureRef.current = '';
          }
        } else {
          setChats([]);
          lastChatsSignatureRef.current = '';
        }
        pollInFlightRef.current = false;
        return;
      }

      const chatsByChannel = await Promise.all(
        openRows.map(({ channel }) =>
          WhatsAppService.fetchChats(channel.instanceName, {
            channelId: channel.id,
            channelLabel: channel.label,
          })
        )
      );

      const merged = chatsByChannel.flat().sort((a, b) => {
        const tsA = a?.lastMessage?.messageTimestamp || a?.messageTimestamp || a?.conversationTimestamp || 0;
        const tsB = b?.lastMessage?.messageTimestamp || b?.messageTimestamp || b?.conversationTimestamp || 0;
        return tsB - tsA;
      }).slice(0, MAX_VISIBLE_CHATS);

      const signature = buildChatsSignature(merged);
      const shouldUpdateChats = signature !== lastChatsSignatureRef.current;
      if (shouldUpdateChats) {
        setChats(merged);
        lastChatsSignatureRef.current = signature;
      }

      if (tenantId) {
        const now = Date.now();
        const shouldPersistSnapshot = shouldUpdateChats || (now - lastSnapshotAtRef.current) > 3 * 60 * 1000;
        if (shouldPersistSnapshot) {
          lastSnapshotAtRef.current = now;
          persistChatsSnapshot({ tenantId, chats: merged.slice(0, MAX_PERSISTED_CHATS) }).catch((error) => {
            console.error('AURA: tenant chat snapshot sync failed', error);
          });
          loadLeadTagMap(tenantId)
            .then((leadMap) => setChatTags(leadMap))
            .catch((error) => console.error('AURA: lead map refresh failed', error));
        }
      }

      pollInFlightRef.current = false;
    };
    const safeCheck = async (options = {}) => {
      try {
        await checkConn(options);
      } catch (error) {
        console.error('AURA connection poll error:', error);
      } finally {
        pollInFlightRef.current = false;
      }
    };
    safeCheck();
    const itv = setInterval(() => safeCheck(), 45000);
    const onManualRefresh = () => safeCheck({ force: true });
    window.addEventListener('aura:refresh-inbox', onManualRefresh);
    return () => {
      clearInterval(itv);
      window.removeEventListener('aura:refresh-inbox', onManualRefresh);
    };
  }, [setIsConnected, setChats, isAuthenticated, tenantBootstrapReady, setWhatsAppChannelStatus, tenantId, setChatTags, setWhatsAppChannels]);

  // AUTH: Handle logout
  const handleLogout = useCallback(async ({ skipRelease = false } = {}) => {
    if (isSupabaseEnabled && !skipRelease) {
      try {
        await releaseUserSession();
      } catch (error) {
        console.error('AURA session release error:', error);
      }
    }
    if (isSupabaseEnabled) {
      await supabase.auth.signOut();
    }
    useStore.getState().logout();
    localStorage.removeItem('auth_token');
    localStorage.removeItem('aura_master_mode');
    localStorage.removeItem('aura_tenant_id');
    setIsAuthenticated(false);
  }, []);

  // SESSION GUARD: allow only one active device per account.
  useEffect(() => {
    if (!isAuthenticated || !isSupabaseEnabled || envFatal) return;
    setSessionGuardError('');
    let cancelled = false;
    let intervalId = null;

    const forceLogoutForSessionConflict = async () => {
      if (cancelled) return;
      const message = 'Esta conta está ativa em outro dispositivo. Por segurança, encerramos esta sessão.';
      setSessionGuardError(message);
      alert(message);
      await handleLogout({ skipRelease: true });
    };

    const bootstrapClaim = async () => {
      const claim = await claimUserSession();
      if (!claim?.ok) {
        await forceLogoutForSessionConflict();
        return;
      }

      const pulse = async () => {
        if (document.hidden) return;
        const beat = await heartbeatUserSession();
        if (!beat?.ok) {
          await forceLogoutForSessionConflict();
        }
      };

      intervalId = setInterval(pulse, 45000);
      await pulse();
    };

    bootstrapClaim();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthenticated, envFatal, handleLogout]);

  const dismissWelcome = async (openBriefing = false) => {
    if (tenantId) {
      try {
        await upsertTenantSettings({
          tenantId,
          userId: useStore.getState().userId,
          patch: { onboardingCompleted: true },
        });
      } catch (error) {
        console.error('AURA onboarding save error:', error);
      }
    }
    setTenantOnboardingCompleted(true);
    setShowWelcome(false);
    if (openBriefing) setIsBriefingOpen(true);
  };

  // AUTH: /app should always show login when unauthenticated
  if (!authReady) {
    return null;
  }

  if (envFatal) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f5f7', padding: 24 }}>
        <div style={{ maxWidth: 720, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 24 }}>
          <h2 style={{ margin: 0, marginBottom: 10 }}>Configuração obrigatória ausente</h2>
          <p style={{ margin: 0, color: '#4b5563' }}>{envFatal}</p>
          <p style={{ marginTop: 12, color: '#6b7280' }}>
            Este bloqueio evita modo local no ambiente online e protege o isolamento de dados entre empresas.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  if (!tenantBootstrapReady) {
    return null;
  }

  if (sessionGuardError) {
    return null;
  }

  // MAIN APP: User is authenticated
  return (
    <div className={`app-container ${currentView === 'crm' ? 'crm-mode' : ''}`}>
      <Sidebar
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenConnect={() => setIsConnectOpen(true)}
        onOpenBriefing={() => setIsBriefingOpen(true)}
        onLogout={handleLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* CENTRAL COLUMN: Selective rendering based on view */}
      {currentView === 'history' && <HistoryView />}
      {currentView === 'dashboard' && <ChatList onOpenMenu={() => setIsMobileMenuOpen(true)} />}
      {/* CRM view is full-width, middle column is purposely excluded */}

      <main className={`main-content ${activeChat ? 'mobile-chat-open' : 'mobile-chat-closed'}`}>
        {currentView === 'crm' ? (
          <CRMView />
        ) : currentView === 'owner' ? (
          <OwnerView />
        ) : activeChat ? (
          <ChatArea isArchived={currentView === 'history'} onBack={() => setActiveChat(null)} />
        ) : (
          <div className="history-placeholder glass-panel" style={{ flex: 1, margin: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <h2 style={{ color: '#86868b', opacity: 0.5 }}>
              {currentView === 'history' ? 'Selecione uma conversa arquivada' : 'Selecione uma conversa para iniciar'}
            </h2>
          </div>
        )}
      </main>

      <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
      <ConnectModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} />
      <BriefingModal isOpen={isBriefingOpen} onClose={() => setIsBriefingOpen(false)} />
      {showWelcome && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(8px)', background: 'rgba(17,18,20,0.35)', zIndex: 1400 }}>
          <div
            className="glass-panel"
            style={{
              width: '92%',
              maxWidth: 560,
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 20,
              boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
              padding: 28,
              display: 'grid',
              gap: 14,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 28, color: '#1d1d1f' }}>Bem-vindo à AURA</h2>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#5D6169' }}>
              {tenantName ? `${tenantName},` : 'Sua empresa,'} seu ambiente está zerado e pronto para começar.
              O briefing inicial ativa a estratégia comercial e o tom de comunicação da IA.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => dismissWelcome(false)}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: '1px solid #DADCE2',
                  background: '#fff',
                  color: '#3B3F46',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Fazer depois
              </button>
              <button
                type="button"
                onClick={() => dismissWelcome(true)}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: 'none',
                  background: 'var(--accent-primary)',
                  color: '#111',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Iniciar briefing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

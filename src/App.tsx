// @ts-nocheck
import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function App() {
  // ============================
  // ÉTATS MULTI-TENANT (SOCIÉTÉS)
  // ============================
  const [companiesList, setCompaniesList] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  // Formulaire Nouvelle Société
  const [newCompName, setNewCompName] = useState("");
  const [newCompLogo, setNewCompLogo] = useState(null);
  const [newCompLogoPreview, setNewCompLogoPreview] = useState("");
  const [newCompIsPrivate, setNewCompIsPrivate] = useState(false);
  const [newCompPin, setNewCompPin] = useState("");

  // Modale Paramètres Société
  const [showCompanySettingsModal, setShowCompanySettingsModal] = useState(false);

  // Gestion du PIN à la connexion
  const [selectedPrivateCompany, setSelectedPrivateCompany] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  // ============================
  // ÉTATS SAAS (SERVICES & APP)
  // ============================
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [workspacePastries, setWorkspacePastries] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modale Espace (Maintenant "Service")
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [editingWorkspaceId, setEditingWorkspaceId] = useState(null);
  const [wsFormName, setWsFormName] = useState("");
  const [wsFormEmoji, setWsFormEmoji] = useState("🏢");
  const [wsFormPastries, setWsFormPastries] = useState([]);

  // Modale Équipes
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [teamFormName, setTeamFormName] = useState("");
  const [teamFormEmoji, setTeamFormEmoji] = useState("📢");

  // Modale Nouveautés
  const [showChangelogModal, setShowChangelogModal] = useState(false);

  // États existants de l'application
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [officialBuyerId, setOfficialBuyerId] = useState(null);
  const [deliveryDay, setDeliveryDay] = useState(1); 

  const [newName, setNewName] = useState("");
  const [newPreference, setNewPreference] = useState("");
  const [newIsTemp, setNewIsTemp] = useState(false);
  const [newEndDate, setNewEndDate] = useState("");
  const [newTeamId, setNewTeamId] = useState("default");

  const [editingUserId, setEditingUserId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPreference, setEditPreference] = useState("");
  const [editAbsenceStart, setEditAbsenceStart] = useState("");
  const [editAbsenceEnd, setEditAbsenceEnd] = useState("");
  const [editTeamId, setEditTeamId] = useState("default");
  const [editEndDate, setEditEndDate] = useState("");

  const [filterTeam, setFilterTeam] = useState("all");
  const [filterTemp, setFilterTemp] = useState(false);
  
  // ÉTATS CALENDRIER GRILLE
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // ============================
  // UTILITAIRES
  // ============================
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const isUserAbsentOn = (user, date) => {
    if (!user.absenceStart || !user.absenceEnd) return false;
    const start = parseLocalDate(user.absenceStart);
    const end = parseLocalDate(user.absenceEnd);
    if (!start || !end) return false;
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    return target >= start && target <= end;
  };

  const isSameDay = (d1, d2) => {
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  };

  const parsePastriesToObjects = (pastriesArray) => {
    if (!pastriesArray || !Array.isArray(pastriesArray) || pastriesArray.length === 0) {
      return [{ emoji: "🍫", name: "Chocolatine" }, { emoji: "🥐", name: "Croissant" }, { emoji: "🍇", name: "Pain au raisin" }];
    }
    return pastriesArray.map(p => {
      if (typeof p === 'object' && p !== null && p.name) return p;
      if (typeof p === 'string') {
        const match = p.match(/^([\p{Emoji}\u200d\s]+)?(.*)$/u);
        let emoji = "🥐";
        let name = p.trim();
        if (match && match[1]) {
          emoji = match[1].trim();
          name = match[2].trim() || "Viennoiserie";
        }
        return { emoji, name };
      }
      return { emoji: "🥐", name: "Viennoiserie" };
    });
  };

  // ============================
  // INITIALISATION & SOCIÉTÉS
  // ============================
  useEffect(() => {
    fetchCompanies();
    const hasSeenV385 = localStorage.getItem("croissantly_v3.8.5_seen");
    if (!hasSeenV385) {
      setShowChangelogModal(true);
      localStorage.setItem("croissantly_v3.8.5_seen", "true");
    }
  }, []);

  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    const savedCompanyId = localStorage.getItem('croissantly_active_company');
    const { data } = await supabase.from('companies').select('*').order('name');
    
    if (data) {
      setCompaniesList(data);
      if (savedCompanyId) {
        const foundCompany = data.find(c => c.id === savedCompanyId);
        if (foundCompany) {
          if (foundCompany.is_private) {
            const hasAccessBadge = localStorage.getItem(`croissantly_access_${savedCompanyId}`);
            if (hasAccessBadge === 'true') setActiveCompany(foundCompany);
          } else {
            setActiveCompany(foundCompany);
          }
        }
      }
    }
    setLoadingCompanies(false);
  };

  // Traitement Image: Redimensionnement via Canvas pour limiter à < 50Ko
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert("Veuillez sélectionner une image valide."); return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 256; 
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height *= maxDim / width; width = maxDim;
        } else if (height > maxDim) {
          width *= maxDim / height; height = maxDim;
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], `logo_${Date.now()}.webp`, { type: 'image/webp' });
          setNewCompLogo(compressedFile);
          setNewCompLogoPreview(canvas.toDataURL('image/webp'));
        }, 'image/webp', 0.8);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    if (newCompIsPrivate && newCompPin.length !== 4) {
      alert("Le code PIN doit comporter exactement 4 chiffres."); return;
    }
    try {
      setLoadingCompanies(true);
      let logoUrl = null;
      if (newCompLogo) {
        const { error: uploadError } = await supabase.storage.from('company-logos').upload(newCompLogo.name, newCompLogo);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('company-logos').getPublicUrl(newCompLogo.name);
        logoUrl = publicUrlData.publicUrl;
      }
      const { data: newCompany, error } = await supabase.from('companies').insert([{
        name: newCompName,
        logo_url: logoUrl,
        is_private: newCompIsPrivate,
        pin_code: newCompIsPrivate ? newCompPin : null
      }]).select().single();
      
      if (error) throw error;

      setCompaniesList([...companiesList, newCompany]);
      loginToCompany(newCompany);
      setIsCreatingCompany(false);
      setNewCompName(""); setNewCompLogo(null); setNewCompLogoPreview(""); setNewCompIsPrivate(false); setNewCompPin("");
    } catch (err) {
      alert("Erreur création entreprise: " + err.message);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const openCompanySettings = () => {
    setNewCompName(activeCompany.name);
    setNewCompLogoPreview(activeCompany.logo_url || "");
    setNewCompLogo(null);
    setNewCompIsPrivate(activeCompany.is_private);
    setNewCompPin(activeCompany.pin_code || "");
    setShowCompanySettingsModal(true);
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    if (newCompIsPrivate && newCompPin.length !== 4) {
      alert("Le code PIN doit comporter exactement 4 chiffres."); return;
    }
    try {
      setLoadingCompanies(true);
      let logoUrl = activeCompany.logo_url;
      
      if (newCompLogo) {
        const { error: uploadError } = await supabase.storage.from('company-logos').upload(newCompLogo.name, newCompLogo);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('company-logos').getPublicUrl(newCompLogo.name);
        logoUrl = publicUrlData.publicUrl;
      }

      const { data: updatedCompany, error } = await supabase.from('companies').update({
        name: newCompName,
        logo_url: logoUrl,
        is_private: newCompIsPrivate,
        pin_code: newCompIsPrivate ? newCompPin : null
      }).eq('id', activeCompany.id).select().single();
      
      if (error) throw error;

      setActiveCompany(updatedCompany);
      const updatedList = companiesList.map(c => c.id === updatedCompany.id ? updatedCompany : c);
      setCompaniesList(updatedList);
      setShowCompanySettingsModal(false);
    } catch (err) {
      alert("Erreur mise à jour: " + err.message);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (window.confirm(`⚠️ ATTENTION !\n\nVoulez-vous vraiment supprimer définitivement l'entreprise "${activeCompany.name}" ?\n\nCela supprimera TOUS les services, TOUTES les équipes et TOUS les utilisateurs associés. Cette action est irréversible.`)) {
      try {
        setLoadingCompanies(true);
        // Supabase CASCADE delete on workspaces will handle children if set up, 
        // but just in case, deleting the company is the primary action.
        const { error } = await supabase.from('companies').delete().eq('id', activeCompany.id);
        if (error) throw error;
        
        logoutCompany();
        fetchCompanies();
        setShowCompanySettingsModal(false);
      } catch (err) {
        alert("Erreur de suppression: " + err.message);
      } finally {
        setLoadingCompanies(false);
      }
    }
  };

  const handleSelectCompany = (company) => {
    if (company.is_private) {
      const hasAccessBadge = localStorage.getItem(`croissantly_access_${company.id}`);
      if (hasAccessBadge === 'true') {
        loginToCompany(company);
      } else {
        setSelectedPrivateCompany(company);
      }
    } else {
      loginToCompany(company);
    }
  };

  const verifyPin = () => {
    if (pinInput === selectedPrivateCompany.pin_code) {
      localStorage.setItem(`croissantly_access_${selectedPrivateCompany.id}`, 'true');
      loginToCompany(selectedPrivateCompany);
      setSelectedPrivateCompany(null);
      setPinInput('');
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const loginToCompany = (company) => {
    localStorage.setItem('croissantly_active_company', company.id);
    setActiveCompany(company);
    setSelectedWorkspace(null);
  };

  const logoutCompany = () => {
    localStorage.removeItem('croissantly_active_company');
    setActiveCompany(null);
    setSelectedWorkspace(null);
  };

  // ============================
  // ACTIONS SERVICES (WORKSPACES)
  // ============================
  useEffect(() => {
    if (activeCompany) fetchWorkspaces();
  }, [activeCompany]);

  const fetchWorkspaces = async () => {
    if (!activeCompany) return;
    setLoadingWorkspaces(true);
    const { data: wsData } = await supabase.from("workspaces").select("*").eq("company_id", activeCompany.id).order("id");
    
    if (wsData && wsData.length > 0) {
      const wsIds = wsData.map(w => w.id);
      const { data: usersData } = await supabase.from("users").select("workspace_id").in("workspace_id", wsIds);
      const wsWithCounts = wsData.map(ws => ({
        ...ws,
        userCount: usersData ? usersData.filter(u => u.workspace_id === ws.id).length : 0
      }));
      setWorkspaces(wsWithCounts);
    } else {
      setWorkspaces([]);
    }
    setLoadingWorkspaces(false);
  };

  useEffect(() => {
    if (selectedWorkspace) {
      fetchUsersAndRotation();
      setIsSidebarOpen(false); 
    }
  }, [selectedWorkspace]);

  const fetchUsersAndRotation = async () => {
    setLoading(true);
    const { data: userData, error: userError } = await supabase.from("users").select("*").eq("workspace_id", selectedWorkspace.id).order("position", { ascending: true }).order("id", { ascending: true }); 

    if (userError || !userData) { setLoading(false); return; }

    let { data: settingsResult } = await supabase.from("app_settings").select("*").eq("workspace_id", selectedWorkspace.id).limit(1);
    let settingsData = settingsResult && settingsResult.length > 0 ? settingsResult[0] : null;
    
    if (!settingsData) {
       const defaultPastries = [{ emoji: "🍫", name: "Chocolatine" }, { emoji: "🥐", name: "Croissant" }, { emoji: "🍇", name: "Pain au raisin" }];
       const newSettings = { workspace_id: selectedWorkspace.id, teams: [{ id: "default", name: "Équipe 1", emoji: "📢" }], current_week: 0, current_buyer_id: null, delivery_day: 1, pastries: defaultPastries };
       const { data: insertedSettings } = await supabase.from("app_settings").insert([newSettings]).select().single();
       settingsData = insertedSettings || newSettings;
    }

    const dbPastries = parsePastriesToObjects(settingsData.pastries);
    setWorkspacePastries(dbPastries);
    if (!newPreference) setNewPreference(dbPastries[0].name);

    let dbTeams = settingsData.teams || [];
    if (!dbTeams.some(t => t.id === "default")) dbTeams = [{ id: "default", name: "Équipe 1", emoji: "📢" }, ...dbTeams];
    setTeams(dbTeams);

    const formattedUsers = userData.map((u) => {
      let pref = u.preference || ""; 
      const matchedPastry = dbPastries.find(p => pref.includes(p.name));
      if (matchedPastry) pref = matchedPastry.name;
      return { id: u.id, name: u.name, preference: pref, isTemp: u.is_temp, endDate: u.end_date, absenceStart: u.absence_start, absenceEnd: u.absence_end, position: u.position !== null ? u.position : u.id, teamId: u.team_id || "default", totalRuns: u.total_runs, totalPastriesPaid: u.total_pastries_paid };
    });
    setUsers(formattedUsers);

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const allPotentialBuyers = formattedUsers.filter(u => !u.isTemp);

    if (settingsData && settingsData.id) {
      const dbDeliveryDay = settingsData.delivery_day || 1;
      setDeliveryDay(dbDeliveryDay);

      const currentDay = today.getDay();
      const dayOffset = currentDay === 0 ? -6 : 1 - currentDay;
      const mondayThisWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset);
      let upcomingDeliveryDate = new Date(mondayThisWeek.getFullYear(), mondayThisWeek.getMonth(), mondayThisWeek.getDate() + (dbDeliveryDay - 1));
      upcomingDeliveryDate.setHours(0,0,0,0);

      if (upcomingDeliveryDate < todayMidnight) upcomingDeliveryDate.setDate(upcomingDeliveryDate.getDate() + 7);

      const activeCycleWeek = getWeekNumber(upcomingDeliveryDate);
      let buyerId = settingsData.current_buyer_id;
      let dbWeek = settingsData.current_week;
      let needDbUpdate = false;

      const buyerStillExists = allPotentialBuyers.some(u => u.id === buyerId);
      if (buyerId && !buyerStillExists && allPotentialBuyers.length > 0) {
        buyerId = allPotentialBuyers[0].id; needDbUpdate = true;
      }

      const isNewCycle = !buyerId || (activeCycleWeek !== dbWeek && (activeCycleWeek > dbWeek || (dbWeek >= 50 && activeCycleWeek <= 2)));

      if (isNewCycle) {
        if (buyerId) {
          let currentIndex = allPotentialBuyers.findIndex(u => u.id === buyerId);
          if (currentIndex === -1) currentIndex = 0;
          let nextBuyer = allPotentialBuyers[(currentIndex + 1) % allPotentialBuyers.length];
          buyerId = nextBuyer?.id;
        } else { buyerId = allPotentialBuyers[0]?.id; }
        needDbUpdate = true;
      }

      let currentObj = allPotentialBuyers.find(u => u.id === buyerId);
      if (currentObj && isUserAbsentOn(currentObj, upcomingDeliveryDate)) {
        let currentIndex = allPotentialBuyers.findIndex(u => u.id === buyerId);
        let nextBuyer = null;
        for (let j = 1; j < allPotentialBuyers.length; j++) {
          let checkIndex = (currentIndex + j) % allPotentialBuyers.length;
          if (!isUserAbsentOn(allPotentialBuyers[checkIndex], upcomingDeliveryDate)) { nextBuyer = allPotentialBuyers[checkIndex]; break; }
        }
        if (nextBuyer) {
          await supabase.from("users").update({ position: nextBuyer.position }).eq("id", currentObj.id);
          await supabase.from("users").update({ position: currentObj.position }).eq("id", nextBuyer.id);
          await supabase.from("app_settings").update({ current_week: activeCycleWeek, current_buyer_id: nextBuyer.id }).eq("workspace_id", selectedWorkspace.id);
          fetchUsersAndRotation();
          return; 
        }
      }
      if (needDbUpdate) await supabase.from("app_settings").update({ current_week: activeCycleWeek, current_buyer_id: buyerId }).eq("workspace_id", selectedWorkspace.id);
      setOfficialBuyerId(buyerId);
    }
    setLoading(false);
  };

  const openCreateWorkspace = () => {
    setEditingWorkspaceId(null); setWsFormName(""); setWsFormEmoji("🏢"); setWsFormPastries([{ emoji: "🍫", name: "Chocolatine" }, { emoji: "🥐", name: "Croissant" }, { emoji: "🍇", name: "Pain au raisin" }]); setShowWorkspaceModal(true);
  };

  const openEditWorkspace = async (ws) => {
    setEditingWorkspaceId(ws.id); setWsFormName(ws.name); setWsFormEmoji(ws.emoji || "🏢");
    const { data: settingsArray } = await supabase.from("app_settings").select("pastries").eq("workspace_id", ws.id).limit(1);
    const settings = settingsArray && settingsArray.length > 0 ? settingsArray[0] : null;
    setWsFormPastries(parsePastriesToObjects(settings?.pastries)); setShowWorkspaceModal(true);
  };

  const updatePastryEmojiInForm = (index, value) => { const newP = [...wsFormPastries]; newP[index].emoji = value; setWsFormPastries(newP); };
  const updatePastryNameInForm = (index, value) => { const newP = [...wsFormPastries]; newP[index].name = value; setWsFormPastries(newP); };
  const removePastryFromForm = (index) => setWsFormPastries(wsFormPastries.filter((_, i) => i !== index));
  const addPastryToForm = () => setWsFormPastries([...wsFormPastries, { emoji: "🥐", name: "Nouveau" }]);

  const handleSaveWorkspace = async (e) => {
    e.preventDefault();
    if (!wsFormName.trim()) return;
    const cleanPastries = wsFormPastries.filter(p => p.name.trim() !== "");
    try {
      if (editingWorkspaceId) {
        await supabase.from("workspaces").update({ name: wsFormName, emoji: wsFormEmoji }).eq("id", editingWorkspaceId);
        const { data: existingSettings } = await supabase.from("app_settings").select("id").eq("workspace_id", editingWorkspaceId).limit(1);
        if (existingSettings && existingSettings.length > 0) {
          await supabase.from("app_settings").update({ pastries: cleanPastries }).eq("id", existingSettings[0].id);
        } else {
          await supabase.from("app_settings").insert([{ workspace_id: editingWorkspaceId, pastries: cleanPastries, current_week: 0, delivery_day: 1, teams: [{ id: "default", name: "Équipe 1", emoji: "📢" }] }]);
        }
        if (selectedWorkspace?.id === editingWorkspaceId) { setSelectedWorkspace({ ...selectedWorkspace, name: wsFormName, emoji: wsFormEmoji }); setWorkspacePastries(cleanPastries); fetchUsersAndRotation(); }
        fetchWorkspaces();
      } else {
        const slug = wsFormName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const { data: newWs } = await supabase.from("workspaces").insert([{ name: wsFormName, slug, emoji: wsFormEmoji, company_id: activeCompany.id }]).select().single();
        if (newWs) {
          await supabase.from("app_settings").insert([{ workspace_id: newWs.id, pastries: cleanPastries, teams: [{ id: "default", name: "Équipe 1", emoji: "📢" }], delivery_day: 1, current_week: 0 }]);
          setSelectedWorkspace(newWs);
          fetchWorkspaces();
        }
      }
      setShowWorkspaceModal(false);
    } catch (err) { alert("🚨 ERREUR : " + err.message); }
  };

  const handleDeleteWorkspace = async (id, name) => {
    if (window.confirm(`⚠️ Voulez-vous vraiment supprimer "${name}" ? Action irréversible.`)) {
      try {
        await supabase.from("users").delete().eq("workspace_id", id);
        await supabase.from("app_settings").delete().eq("workspace_id", id);
        await supabase.from("workspaces").delete().eq("id", id);
        setShowWorkspaceModal(false); if (selectedWorkspace?.id === id) setSelectedWorkspace(null); fetchWorkspaces();
      } catch (err) { alert("🚨 ERREUR DE SUPPRESSION : " + err.message); }
    }
  };

  const openCreateTeam = () => { setEditingTeamId(null); setTeamFormName(""); setTeamFormEmoji("📢"); setShowTeamModal(true); };
  const openEditTeam = (team) => { setEditingTeamId(team.id); setTeamFormName(team.name); setTeamFormEmoji(team.emoji); setShowTeamModal(true); };

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    if (!teamFormName.trim()) return;
    let updatedTeams;
    if (editingTeamId) updatedTeams = teams.map(t => t.id === editingTeamId ? { ...t, name: teamFormName, emoji: teamFormEmoji } : t);
    else updatedTeams = [...teams, { id: Date.now().toString(), name: teamFormName, emoji: teamFormEmoji || "🏢" }];
    await supabase.from("app_settings").update({ teams: updatedTeams }).eq("workspace_id", selectedWorkspace.id);
    setTeams(updatedTeams); setShowTeamModal(false); fetchUsersAndRotation(); 
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    if (teamId === "default") { alert("Impossible de supprimer l'équipe de base."); return; }
    if (window.confirm(`Supprimer l'équipe "${teamName}" ?`)) {
      const updatedTeams = teams.filter(t => t.id !== teamId);
      setTeams(updatedTeams);
      await supabase.from("app_settings").update({ teams: updatedTeams }).eq("workspace_id", selectedWorkspace.id);
      await supabase.from("users").update({ team_id: null }).eq("team_id", teamId).eq("workspace_id", selectedWorkspace.id);
      if (filterTeam === teamId) setFilterTeam("all"); if (newTeamId === teamId) setNewTeamId("default");
      fetchUsersAndRotation();
    }
  };

  // ============================
  // ACTIONS UTILISATEURS
  // ============================
  const handleDeliveryDayChange = async (e) => {
    const newDay = parseInt(e.target.value); setDeliveryDay(newDay);
    await supabase.from("app_settings").update({ delivery_day: newDay }).eq("workspace_id", selectedWorkspace.id); fetchUsersAndRotation();
  };

  const updateMember = async (id) => {
    await supabase.from("users").update({ name: editName, preference: editPreference, team_id: editTeamId === "default" ? null : editTeamId, absence_start: editAbsenceStart || null, absence_end: editAbsenceEnd || null, end_date: editEndDate || null }).eq("id", id);
    setEditingUserId(null); fetchUsersAndRotation();
  };

  const deleteMember = async (id, name) => {
    if (window.confirm("Enlever " + name + " ?")) {
      if (officialBuyerId === id) {
        const potentialBuyers = users.filter(u => !u.isTemp); const currentIndex = potentialBuyers.findIndex(u => u.id === id);
        if (currentIndex !== -1 && potentialBuyers.length > 1) {
          const nextBuyer = potentialBuyers[(currentIndex + 1) % potentialBuyers.length];
          await supabase.from("app_settings").update({ current_buyer_id: nextBuyer.id }).eq("workspace_id", selectedWorkspace.id);
        }
      }
      await supabase.from("users").delete().eq("id", id); setEditingUserId(null); fetchUsersAndRotation();
    }
  };

  const addMember = async (e) => {
    e.preventDefault(); if (!newName || !newPreference) return;
    const maxPosition = users.length > 0 ? Math.max(...users.map(u => u.position)) : 0;
    await supabase.from("users").insert([{ name: newName, preference: newPreference, is_temp: newIsTemp, team_id: newTeamId === "default" ? null : newTeamId, end_date: newIsTemp ? newEndDate : null, position: maxPosition + 1, total_runs: 0, total_pastries_paid: 0, workspace_id: selectedWorkspace.id }]);
    setNewName(""); setNewIsTemp(false); setNewEndDate(""); setNewTeamId("default"); fetchUsersAndRotation();
  };

  const moveUser = async (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === users.length - 1)) return; 
    const userToMove = users[index]; const userToSwap = users[index + direction];
    let newPosMove = userToSwap.position; let newPosSwap = userToMove.position;
    if (newPosMove === newPosSwap) newPosMove += direction;
    const newUsers = [...users];
    newUsers[index] = { ...userToMove, position: newPosMove }; newUsers[index + direction] = { ...userToSwap, position: newPosSwap };
    newUsers.sort((a, b) => a.position - b.position); setUsers(newUsers);
    await supabase.from("users").update({ position: newPosMove }).eq("id", userToMove.id); await supabase.from("users").update({ position: newPosSwap }).eq("id", userToSwap.id);
    fetchUsersAndRotation();
  };

  const skipTurn = async (nextId, nextName) => {
    if (!nextId) return;
    if (window.confirm(`Désigner ${nextName} pour cette semaine ?`)) {
      const today = new Date(); const currentDay = today.getDay(); const dayOffset = currentDay === 0 ? -6 : 1 - currentDay;
      const mondayThisWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset);
      let upcomingDeliveryDate = new Date(mondayThisWeek.getFullYear(), mondayThisWeek.getMonth(), mondayThisWeek.getDate() + (deliveryDay - 1));
      upcomingDeliveryDate.setHours(0,0,0,0);
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      if (upcomingDeliveryDate < todayMidnight) upcomingDeliveryDate.setDate(upcomingDeliveryDate.getDate() + 7);
      const activeCycleWeek = getWeekNumber(upcomingDeliveryDate);
      await supabase.from("app_settings").update({ current_buyer_id: nextId, current_week: activeCycleWeek }).eq("workspace_id", selectedWorkspace.id);
      fetchUsersAndRotation();
    }
  };

  const goBackTurn = async () => {
    const potentialBuyers = users.filter(u => !u.isTemp);
    if (potentialBuyers.length <= 1 || !officialBuyerId) return;
    let currentIndex = potentialBuyers.findIndex(u => u.id === officialBuyerId); if (currentIndex === -1) return;
    let prevIndex = (currentIndex - 1 + potentialBuyers.length) % potentialBuyers.length;
    if (window.confirm(`Revenir en arrière pour ${potentialBuyers[prevIndex].name} ?`)) {
      await supabase.from("app_settings").update({ current_buyer_id: potentialBuyers[prevIndex].id }).eq("workspace_id", selectedWorkspace.id); fetchUsersAndRotation();
    }
  };

  // ============================
  // LOGIQUE CALENDRIER (5 JOURS)
  // ============================
  const generateCalendar = () => {
    if (!officialBuyerId || users.length === 0) return [];
    const potentialBuyers = users.filter(u => !u.isTemp); if (potentialBuyers.length === 0) return [];
    let simulatedBuyers = [...potentialBuyers];
    let currentPointer = simulatedBuyers.findIndex(u => u.id === officialBuyerId); if (currentPointer === -1) currentPointer = 0; 
    
    const today = new Date(); const currentDay = today.getDay(); const dayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const mondayThisWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset);
    let deliveryDate = new Date(mondayThisWeek.getFullYear(), mondayThisWeek.getMonth(), mondayThisWeek.getDate() + (deliveryDay - 1)); deliveryDate.setHours(0,0,0,0);
    if (deliveryDate < new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)) deliveryDate.setDate(deliveryDate.getDate() + 7);

    // 1. GÉNÉRATION DU FUTUR
    const futureRotation = [];
    let futureDate = new Date(deliveryDate);
    let futurePointer = currentPointer;
    let futureSimulatedBuyers = [...simulatedBuyers];

    for (let i = 0; i < 52; i++) {
      let candidate = futureSimulatedBuyers[futurePointer];
      if (candidate && isUserAbsentOn(candidate, futureDate)) {
        let nextAvailIndex = -1;
        for (let j = 1; j < futureSimulatedBuyers.length; j++) {
          let checkIndex = (futurePointer + j) % futureSimulatedBuyers.length;
          if (!isUserAbsentOn(futureSimulatedBuyers[checkIndex], futureDate)) { nextAvailIndex = checkIndex; break; }
        }
        if (nextAvailIndex !== -1) {
          let temp = futureSimulatedBuyers[futurePointer]; futureSimulatedBuyers[futurePointer] = futureSimulatedBuyers[nextAvailIndex]; futureSimulatedBuyers[nextAvailIndex] = temp; candidate = futureSimulatedBuyers[futurePointer];
        }
      }
      if (candidate && !isUserAbsentOn(candidate, futureDate)) {
        const weekEligibleUsers = users.filter((u) => !isUserAbsentOn(u, futureDate) && !(u.isTemp && u.endDate && parseLocalDate(u.endDate) < futureDate));
        const weekCounts = {}; workspacePastries.forEach(p => weekCounts[p.name] = 0);
        weekEligibleUsers.forEach(u => { if (weekCounts[u.preference] === undefined) weekCounts[u.preference] = 0; weekCounts[u.preference]++; });
        futureRotation.push({ id: candidate.id, date: new Date(futureDate), name: candidate.name, count: weekEligibleUsers.length, counts: weekCounts });
      }
      futurePointer = (futurePointer + 1) % futureSimulatedBuyers.length; futureDate.setDate(futureDate.getDate() + 7);
    }

    // 2. GÉNÉRATION DU PASSÉ
    const pastRotation = [];
    let pastDate = new Date(deliveryDate);
    pastDate.setDate(pastDate.getDate() - 7);
    let pastPointer = (currentPointer - 1 + simulatedBuyers.length) % simulatedBuyers.length;

    for (let i = 0; i < 52; i++) {
      let candidate = simulatedBuyers[pastPointer];
      let found = candidate;
      let offset = 0;
      while(found && isUserAbsentOn(found, pastDate) && offset < simulatedBuyers.length) {
          offset++;
          found = simulatedBuyers[(pastPointer - offset + simulatedBuyers.length) % simulatedBuyers.length];
      }
      if (found && !isUserAbsentOn(found, pastDate)) {
        const weekEligibleUsers = users.filter((u) => !isUserAbsentOn(u, pastDate) && !(u.isTemp && u.endDate && parseLocalDate(u.endDate) < pastDate));
        const weekCounts = {}; workspacePastries.forEach(p => weekCounts[p.name] = 0);
        weekEligibleUsers.forEach(u => { if (weekCounts[u.preference] === undefined) weekCounts[u.preference] = 0; weekCounts[u.preference]++; });
        pastRotation.unshift({ id: found.id, date: new Date(pastDate), name: found.name, count: weekEligibleUsers.length, counts: weekCounts });
      }
      pastPointer = (pastPointer - 1 + simulatedBuyers.length) % simulatedBuyers.length;
      pastDate.setDate(pastDate.getDate() - 7);
    }

    return [...pastRotation, ...futureRotation];
  };

  const prevMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));

  const generateGridDays = () => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    
    let dayOfWeek = firstDayOfMonth.getDay();
    let diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const startDate = new Date(year, month, 1 + diffToMonday);
    const daysArray = [];
    
    let currentDate = new Date(startDate);
    while (daysArray.length < 30) {
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        daysArray.push({
          date: new Date(currentDate),
          isCurrentMonth: currentDate.getMonth() === month
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return daysArray;
  };

  const getAbsencesForDay = (targetDate) => {
    return users.filter(u => {
      if (!u.absenceStart || !u.absenceEnd) return false;
      const start = parseLocalDate(u.absenceStart);
      const end = parseLocalDate(u.absenceEnd);
      if (!start || !end) return false;
      return targetDate >= start && targetDate <= end;
    });
  };

  // ============================
  // DONNÉES D'AFFICHAGE SAAS
  // ============================
  const calendarData = generateCalendar();
  const todayMidnight = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 0, 0, 0);
  
  const upcomingDeliveries = calendarData.filter(d => d.date >= todayMidnight);
  const currentEntry = upcomingDeliveries[0];
  const nextEntry = upcomingDeliveries[1];
  
  const activeOrderDate = currentEntry ? currentEntry.date : todayMidnight;
  const eligibleForOrder = users.filter(u => !isUserAbsentOn(u, activeOrderDate) && !(u.isTemp && u.endDate && parseLocalDate(u.endDate) < activeOrderDate));
  
  const counts = {}; workspacePastries.forEach(p => counts[p.name] = 0);
  const breakdownByTeam = {};

  eligibleForOrder.forEach(u => {
    if (counts[u.preference] === undefined) counts[u.preference] = 0; counts[u.preference]++;
    const userTeam = teams.find(t => t.id === u.teamId);
    if (userTeam) {
      if (!breakdownByTeam[userTeam.id]) {
        const initCounts = {}; workspacePastries.forEach(p => initCounts[p.name] = 0);
        breakdownByTeam[userTeam.id] = { team: userTeam, counts: initCounts, total: 0 };
      }
      if (breakdownByTeam[userTeam.id].counts[u.preference] === undefined) breakdownByTeam[userTeam.id].counts[u.preference] = 0;
      breakdownByTeam[userTeam.id].counts[u.preference]++;
      breakdownByTeam[userTeam.id].total++;
    }
  });

  const totalPastries = eligibleForOrder.length;
  const dynamicNextDeliveryDate = currentEntry ? `Ce ${currentEntry.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}` : "Prochainement";
  const cleanCurrentDate = currentEntry ? currentEntry.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).replace(/^\w/, c => c.toUpperCase()) : "";
  const filteredUsers = users.filter(u => (!filterTemp || u.isTemp) && (filterTeam === "all" || u.teamId === filterTeam));

  // ============================
  // COMPOSANTS MODALES
  // ============================
  const WorkspaceModal = () => (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative border border-stone-100 animate-fade-in">
        <h3 className="text-2xl font-black text-stone-900 mb-6 tracking-tight">{editingWorkspaceId ? "Réglages Service" : "Créer un service"}</h3>
        <form onSubmit={handleSaveWorkspace} className="space-y-5">
          <div className="flex gap-3">
            <div className="w-16">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 block">Icône</label>
              <input type="text" value={wsFormEmoji} onChange={(e) => setWsFormEmoji(e.target.value)} placeholder="🏢" maxLength={2} className="w-full text-center border border-stone-200 p-3 rounded-xl bg-stone-50 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none transition-all text-xl" required />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 block">Nom du Service</label>
              <input type="text" value={wsFormName} onChange={(e) => setWsFormName(e.target.value)} placeholder="Ex: Ressources Humaines" className="w-full border border-stone-200 p-3 rounded-xl bg-stone-50 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none transition-all font-medium text-stone-800" required />
            </div>
          </div>
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-3 block">Carte des Viennoiseries</label>
            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {wsFormPastries.map((pastry, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="text" value={pastry.emoji} onChange={(e) => updatePastryEmojiInForm(idx, e.target.value)} className="w-12 text-center border border-stone-200 p-2.5 rounded-lg text-sm bg-white focus:border-amber-400 focus:outline-none" maxLength={2} required />
                  <input type="text" value={pastry.name} onChange={(e) => updatePastryNameInForm(idx, e.target.value)} placeholder="Nom" className="flex-1 border border-stone-200 p-2.5 rounded-lg text-sm bg-white font-medium focus:border-amber-400 focus:outline-none text-stone-700" required />
                  <button type="button" onClick={() => removePastryFromForm(idx)} disabled={wsFormPastries.length <= 1} className="p-2.5 bg-stone-100 text-stone-400 rounded-lg hover:bg-red-50 hover:text-red-500 disabled:opacity-30 transition-colors">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addPastryToForm} className="text-xs font-bold text-stone-600 bg-white border border-stone-200 py-2 px-4 rounded-lg hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm w-full">+ Ajouter une option</button>
          </div>
          
          <div className="flex justify-between items-center pt-4 mt-2">
            {editingWorkspaceId ? (
              <button type="button" onClick={() => handleDeleteWorkspace(editingWorkspaceId, wsFormName)} className="text-xs font-bold text-red-500 hover:text-red-600 px-2 underline decoration-red-200 underline-offset-4">Supprimer le service</button>
            ) : <div></div>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowWorkspaceModal(false)} className="text-sm font-bold text-stone-500 hover:text-stone-800 py-2.5 px-5 rounded-xl hover:bg-stone-100 transition-colors">Annuler</button>
              <button type="submit" className="text-sm font-bold bg-amber-400 text-stone-900 py-2.5 px-6 rounded-xl shadow-sm hover:bg-amber-300 hover:shadow transition-all">Enregistrer</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  const CompanySettingsModal = () => (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative border border-stone-100 animate-fade-in">
        <h3 className="text-2xl font-black text-stone-900 mb-6 tracking-tight">Paramètres Entreprise</h3>
        <form onSubmit={handleUpdateCompany} className="space-y-5">
          
          <div className="flex items-center gap-4">
            <label className="cursor-pointer group relative block shrink-0">
              <div className={`w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors ${newCompLogoPreview ? 'border-amber-400' : 'border-stone-300 group-hover:border-amber-400 bg-stone-50'}`}>
                {newCompLogoPreview ? (
                  <img src={newCompLogoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-stone-400 flex flex-col items-center gap-1">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M20.4 14.5L16 10 4 20"/></svg>
                  </span>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 block">Nom de l'entreprise</label>
              <input type="text" value={newCompName} onChange={(e) => setNewCompName(e.target.value)} className="w-full border border-stone-200 p-3 rounded-xl bg-stone-50 focus:border-amber-400 focus:outline-none font-medium text-stone-800" required />
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-100 p-4 rounded-xl mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={newCompIsPrivate} onChange={(e) => setNewCompIsPrivate(e.target.checked)} className="w-5 h-5 text-amber-400 border-stone-300 rounded focus:ring-amber-400" />
              <div>
                <span className="flex items-center gap-2 text-sm font-bold text-stone-800">
                  Rendre cet espace privé
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </span>
                <span className="block text-xs text-stone-500">Un code PIN sera demandé.</span>
              </div>
            </label>
            
            {newCompIsPrivate && (
              <div className="mt-4 animate-fade-in pt-4 border-t border-stone-200">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 block">Code PIN (4 chiffres)</label>
                <input type="password" inputMode="numeric" maxLength={4} value={newCompPin} onChange={(e) => setNewCompPin(e.target.value)} placeholder="1234" className="w-full text-center tracking-[1em] font-black border border-stone-200 p-3 rounded-xl bg-white focus:border-amber-400 focus:outline-none" required={newCompIsPrivate} />
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 mt-2">
            <button type="button" onClick={handleDeleteCompany} className="text-xs font-bold text-red-500 hover:text-red-600 px-2 underline decoration-red-200 underline-offset-4">Supprimer l'entreprise</button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowCompanySettingsModal(false)} className="text-sm font-bold text-stone-500 hover:text-stone-800 py-2.5 px-5 rounded-xl hover:bg-stone-100 transition-colors">Annuler</button>
              <button type="submit" disabled={loadingCompanies} className="text-sm font-bold bg-amber-400 text-stone-900 py-2.5 px-6 rounded-xl shadow-sm hover:bg-amber-300 hover:shadow transition-all disabled:opacity-50">
                {loadingCompanies ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  const ChangelogModal = () => (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative border border-stone-100 animate-fade-in">
        <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm border border-amber-200">✨</div>
        <h3 className="text-2xl font-black text-stone-900 mb-2 tracking-tight">Quoi de neuf ? (V.3.8.5)</h3>
        <p className="text-stone-500 text-sm mb-6">L'application fait peau neuve avec une mise à jour majeure !</p>
        
        <ul className="space-y-4 mb-8">
          <li className="flex gap-3">
            <span className="text-amber-500 mt-0.5">📱</span>
            <div>
              <strong className="block text-stone-800 text-sm">Application Web (PWA)</strong>
              <span className="text-xs text-stone-500 leading-snug block">Installez Croissantly directement sur votre téléphone ou bureau pour une expérience plein écran ultra-rapide sans passer par les stores.</span>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-amber-500 mt-0.5">✨</span>
            <div>
              <strong className="block text-stone-800 text-sm">Nouvelle Interface</strong>
              <span className="text-xs text-stone-500 leading-snug block">Design repensé, plus clair et moderne, avec une navigation par onglets optimisée pour faciliter l'utilisation quotidienne.</span>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-amber-500 mt-0.5">🚀</span>
            <div>
              <strong className="block text-stone-800 text-sm">Nouvelles Fonctionnalités</strong>
              <span className="text-xs text-stone-500 leading-snug block">Calendrier recentré sur 5 jours ouvrés, gestion intelligente des absences épurée, et réorganisation des statistiques d'équipes.</span>
            </div>
          </li>
        </ul>
        
        <button onClick={() => setShowChangelogModal(false)} className="w-full bg-stone-900 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-stone-800 hover:-translate-y-0.5 transition-all">Génial, merci !</button>
      </div>
    </div>
  );

  // ============================
  // RENDER : ÉCRAN DE SÉLECTION D'ENTREPRISE
  // ============================
  if (!activeCompany) {
    return (
      <div className="flex min-h-screen bg-[#F7F5F0] text-stone-900 relative font-app items-center justify-center p-4">
        
        {/* Modale Demande PIN */}
        {selectedPrivateCompany && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center animate-fade-in border border-stone-100">
              <div className="w-16 h-16 mx-auto bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-center text-2xl mb-4 overflow-hidden">
                {selectedPrivateCompany.logo_url ? <img src={selectedPrivateCompany.logo_url} alt="logo" className="w-full h-full object-cover" /> : "🏢"}
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Espace privé</h3>
              <p className="text-sm text-stone-500 mb-6">Entrez le code PIN de {selectedPrivateCompany.name}</p>
              
              <input 
                type="password" 
                inputMode="numeric" 
                maxLength={4} 
                value={pinInput} 
                onChange={(e) => setPinInput(e.target.value)} 
                className="w-full text-center tracking-[0.5em] text-3xl font-black border border-stone-200 p-4 rounded-xl bg-stone-50 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none mb-2"
              />
              {pinError && <p className="text-red-500 text-xs font-bold mb-4">Code PIN incorrect.</p>}
              
              <div className="flex gap-2 mt-6">
                <button onClick={() => setSelectedPrivateCompany(null)} className="flex-1 bg-stone-100 text-stone-600 font-bold py-3 rounded-xl hover:bg-stone-200 transition-colors">Annuler</button>
                <button onClick={verifyPin} className="flex-1 bg-amber-400 text-stone-900 font-bold py-3 rounded-xl shadow-sm hover:bg-amber-300 transition-all">Valider</button>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-stone-200 p-8 sm:p-10 relative overflow-hidden">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl shadow-sm flex items-center justify-center overflow-hidden border border-stone-200/50">
               <img src={process.env.PUBLIC_URL + "/Flavicon.png"} alt="Croissantly" className="w-full h-full object-cover" />
            </div>
          </div>
          
          <h1 className="text-3xl font-serif text-stone-900 text-center mb-2">Croissantly</h1>
          <p className="text-stone-500 text-center mb-10 text-sm">Rejoignez l'espace de votre entreprise ou créez le vôtre.</p>

          {!isCreatingCompany ? (
            <div className="animate-fade-in">
              {loadingCompanies ? (
                <div className="text-center text-stone-400 animate-pulse py-8">Chargement des entreprises...</div>
              ) : (
                <div className="space-y-3 mb-8 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {companiesList.length > 0 ? companiesList.map(comp => (
                    <button 
                      key={comp.id} 
                      onClick={() => handleSelectCompany(comp)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border border-stone-200 bg-white hover:border-amber-400 hover:shadow-sm transition-all text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center overflow-hidden text-xl">
                          {comp.logo_url ? <img src={comp.logo_url} alt={comp.name} className="w-full h-full object-cover" /> : "🏢"}
                        </div>
                        <span className="font-bold text-stone-800 text-lg group-hover:text-amber-600 transition-colors">{comp.name}</span>
                      </div>
                      {comp.is_private && (
                        <span className="text-stone-400 group-hover:text-amber-500 transition-colors" title="Espace privé">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </span>
                      )}
                    </button>
                  )) : (
                    <div className="text-center text-stone-400 text-sm py-4">Aucune entreprise enregistrée.</div>
                  )}
                </div>
              )}
              
              <div className="pt-6 border-t border-stone-100 text-center">
                <button onClick={() => setIsCreatingCompany(true)} className="text-sm font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 py-3 px-6 rounded-xl transition-colors w-full">
                  + Créer une nouvelle entreprise
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveCompany} className="animate-fade-in space-y-5">
              <div className="text-center mb-6">
                <label className="cursor-pointer group relative inline-block">
                  <div className={`w-24 h-24 mx-auto rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors ${newCompLogoPreview ? 'border-amber-400' : 'border-stone-300 group-hover:border-amber-400 bg-stone-50'}`}>
                    {newCompLogoPreview ? (
                      <img src={newCompLogoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-stone-400 flex flex-col items-center gap-1">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M20.4 14.5L16 10 4 20"/></svg>
                        <span className="text-[10px] font-bold">Logo</span>
                      </span>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                <p className="text-[10px] text-stone-400 mt-2 max-w-[200px] mx-auto">Formats acceptés : JPG, PNG, WebP. L'image sera automatiquement optimisée.</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 block">Nom de l'entreprise</label>
                <input type="text" value={newCompName} onChange={(e) => setNewCompName(e.target.value)} placeholder="Ex: CroissantTech" className="w-full border border-stone-200 p-3 rounded-xl bg-stone-50 focus:border-amber-400 focus:outline-none" required />
              </div>

              <div className="bg-stone-50 border border-stone-100 p-4 rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={newCompIsPrivate} onChange={(e) => setNewCompIsPrivate(e.target.checked)} className="w-5 h-5 text-amber-400 border-stone-300 rounded focus:ring-amber-400" />
                  <div>
                    <span className="flex items-center gap-2 text-sm font-bold text-stone-800">
                      Rendre cet espace privé
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </span>
                    <span className="block text-xs text-stone-500">Un code PIN sera demandé pour y accéder.</span>
                  </div>
                </label>
                
                {newCompIsPrivate && (
                  <div className="mt-4 animate-fade-in pt-4 border-t border-stone-200">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 block">Code PIN (4 chiffres)</label>
                    <input type="password" inputMode="numeric" maxLength={4} value={newCompPin} onChange={(e) => setNewCompPin(e.target.value)} placeholder="1234" className="w-full text-center tracking-[1em] font-black border border-stone-200 p-3 rounded-xl bg-white focus:border-amber-400 focus:outline-none" required={newCompIsPrivate} />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsCreatingCompany(false)} className="flex-1 bg-stone-100 text-stone-600 font-bold py-3.5 rounded-xl hover:bg-stone-200 transition-colors">Retour</button>
                <button type="submit" disabled={loadingCompanies} className="flex-1 bg-amber-400 text-stone-900 font-bold py-3.5 rounded-xl shadow-sm hover:bg-amber-300 transition-all disabled:opacity-50">
                  {loadingCompanies ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ============================
  // RENDER PRINCIPAL (SAAS LAYOUT)
  // ============================
  return (
    <div className="flex h-screen bg-[#F7F5F0] text-stone-900 overflow-hidden relative font-app">
      
      {showWorkspaceModal && WorkspaceModal()}
      {showCompanySettingsModal && CompanySettingsModal()}
      {showChangelogModal && ChangelogModal()}
      
      {/* SIDEBAR (Navigation de gauche) */}
      <aside className={`absolute inset-y-0 left-0 z-40 w-72 bg-[#F7F5F0] transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col px-5 py-6 border-r border-stone-200/60`}>
        
        {/* Company Logo Section */}
        <div className="flex justify-between items-center mb-10 pl-2 shrink-0 group">
          <div className="flex items-center gap-3 w-full">
            <div className="w-11 h-11 rounded-xl shadow-sm flex items-center justify-center overflow-hidden border border-stone-200/50 bg-white shrink-0 text-xl">
               {activeCompany.logo_url ? <img src={activeCompany.logo_url} alt="Logo" className="w-full h-full object-cover" /> : "🏢"}
            </div>
            <div className="flex flex-col overflow-hidden w-full">
              <span className="text-lg font-black tracking-tight text-stone-800 truncate leading-tight flex items-center gap-1.5">
                {activeCompany.name}
                {activeCompany.is_private && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 mt-0.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                )}
              </span>
              <button onClick={logoutCompany} className="text-[10px] font-bold text-stone-400 hover:text-amber-500 uppercase tracking-widest text-left transition-colors flex items-center gap-1 mt-0.5">
                Changer d'entreprise 
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>
          <button className="md:hidden text-stone-400 text-2xl ml-2" onClick={() => setIsSidebarOpen(false)}>×</button>
        </div>

        {/* Barre de Recherche Espace */}
        <div className="mb-4 shrink-0">
           <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3 pl-2">Liste des Services</h4>
           <div className="relative">
             <input 
               type="text" 
               placeholder="Rechercher..." 
               value={workspaceSearch}
               onChange={(e) => setWorkspaceSearch(e.target.value)}
               className="w-full bg-white border border-stone-200 text-stone-700 text-sm rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all placeholder-stone-400 font-medium"
             />
             <svg className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
           </div>
        </div>

        {/* Workspaces List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
          {loadingWorkspaces ? (
             <div className="text-sm text-stone-400 px-2 py-3 animate-pulse">Chargement...</div>
          ) : (
            <div className="space-y-1">
              {workspaces.filter(ws => (ws.name || "").toLowerCase().includes(workspaceSearch.toLowerCase())).map(ws => {
                const isActive = selectedWorkspace?.id === ws.id;
                return (
                  <div key={ws.id} className="relative group">
                    <button
                      onClick={() => setSelectedWorkspace(ws)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${isActive ? "bg-white shadow-sm border border-stone-200/50 text-stone-900" : "text-stone-600 hover:bg-stone-200/50 hover:text-stone-900"}`}
                    >
                      <span className={`text-xl transition-transform ${isActive ? "scale-110" : ""}`}>{ws.emoji || "🏢"}</span>
                      <div className="flex flex-col items-start min-w-0 pr-6">
                         <span className={`text-sm w-full truncate ${isActive ? "font-bold" : "font-medium"}`}>{ws.name}</span>
                         <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-0.5">{ws.userCount || 0} membre{ws.userCount > 1 ? 's' : ''}</span>
                      </div>
                    </button>
                    {isActive && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); openEditWorkspace(ws); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Réglages"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                      </button>
                    )}
                  </div>
                );
              })}
              {workspaces.filter(ws => (ws.name || "").toLowerCase().includes(workspaceSearch.toLowerCase())).length === 0 && (
                <div className="text-center text-stone-400 text-xs py-4">Aucun service trouvé</div>
              )}
            </div>
          )}
        </div>

        {/* New Workspace Action & Changelog */}
        <div className="mt-auto shrink-0 flex flex-col gap-2">
          <button onClick={openCreateWorkspace} className="w-full flex items-center gap-3 px-3 py-2.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200/50 rounded-xl transition-all text-left font-medium text-sm">
            <span className="w-6 h-6 rounded flex items-center justify-center bg-stone-200/50 text-stone-500 text-lg leading-none">+</span>
            Créer un service
          </button>
          
          <button onClick={openCompanySettings} className="w-full flex items-center gap-3 px-3 py-2.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200/50 rounded-xl transition-all text-left font-medium text-sm">
            <span className="w-6 h-6 rounded flex items-center justify-center bg-stone-200/50 text-stone-500 text-lg leading-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </span>
            Paramètres {activeCompany.name}
          </button>

          <div className="pt-4 border-t border-stone-200/60 mt-2 flex flex-col gap-2">
            <button onClick={() => setShowChangelogModal(true)} className="w-full flex justify-center items-center gap-2 px-3 py-2 text-stone-600 hover:text-stone-900 hover:bg-white rounded-xl transition-all font-bold text-sm border border-stone-200/60 shadow-sm">
              Voir les nouveautés ✨
            </button>
            <div className="text-center text-[10px] text-stone-400 font-bold tracking-widest uppercase">
              V.4.1
            </div>
          </div>
        </div>
      </aside>

      {/* OVERLAY MOBILE */}
      {isSidebarOpen && <div className="fixed inset-0 bg-stone-900/20 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-white md:my-3 md:mr-3 md:rounded-3xl shadow-[-5px_0_20px_rgba(0,0,0,0.02)] border border-stone-200 relative overflow-hidden">
        
        {!selectedWorkspace ? (
          <div className="flex-1 flex flex-col relative bg-stone-50/50">
            {/* Header Mobile pour la page d'accueil */}
            <div className="md:hidden flex items-center p-4 border-b border-stone-100 bg-white shrink-0">
              <button className="text-stone-500 p-2 -ml-2 hover:bg-stone-100 rounded-lg" onClick={() => setIsSidebarOpen(true)}>☰</button>
              <span className="font-bold text-stone-900 ml-2 truncate">{activeCompany.name}</span>
            </div>
            
            {/* Contenu central de bienvenue */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto custom-scrollbar">
              <div className="w-24 h-24 rounded-3xl shadow-lg flex items-center justify-center mb-6 overflow-hidden border border-stone-200/50 shrink-0 bg-white text-4xl">
                 {activeCompany.logo_url ? <img src={activeCompany.logo_url} alt="Logo" className="w-full h-full object-cover" /> : "🏢"}
              </div>
              <h2 className="text-3xl font-serif text-stone-800 mb-2 text-center">Bienvenue chez {activeCompany.name}</h2>
              <p className="text-stone-500 max-w-sm mb-10 text-center">Sélectionnez un service pour organiser la prochaine tournée de viennoiseries de votre équipe.</p>
              
              {/* Liste cliquable des services existants */}
              {workspaces.length > 0 && (
                <div className="w-full max-w-md space-y-3 mb-10">
                  {workspaces.map(ws => (
                    <button 
                      key={ws.id} 
                      onClick={() => setSelectedWorkspace(ws)} 
                      className="w-full flex items-center gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm hover:border-amber-400 hover:shadow transition-all text-left group"
                    >
                       <span className="text-3xl group-hover:scale-110 transition-transform">{ws.emoji || "🏢"}</span>
                       <div>
                         <h3 className="font-bold text-stone-800 text-lg">{ws.name}</h3>
                         <p className="text-xs text-stone-400 font-bold uppercase tracking-wider">{ws.userCount || 0} membre{ws.userCount > 1 ? 's' : ''}</p>
                       </div>
                    </button>
                  ))}
                </div>
              )}

              <button onClick={openCreateWorkspace} className="bg-stone-900 text-white font-medium py-3.5 px-8 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                {workspaces.length > 0 ? "+ Créer un nouveau service" : "Créer le premier service"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header Mobile / Navigation Interne */}
            <div className="shrink-0 bg-white border-b border-stone-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 relative">
              <div className="flex items-center gap-3">
                <button className="md:hidden text-stone-500 p-2 -ml-2 hover:bg-stone-100 rounded-lg" onClick={() => setIsSidebarOpen(true)}>☰</button>
                <div>
                  <h1 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
                    {selectedWorkspace.emoji} {selectedWorkspace.name}
                  </h1>
                </div>
              </div>
              
              <div className="flex space-x-1 bg-stone-100/80 p-1 rounded-xl w-full sm:w-auto">
                {["dashboard", "calendar", "team"].map(tab => (
                  <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)} 
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm transition-all ${activeTab === tab ? "bg-white text-stone-900 shadow-sm font-bold" : "text-stone-500 font-medium hover:text-stone-700 hover:bg-stone-200/50"}`}
                  >
                    {tab === 'dashboard' ? 'Aperçu' : tab === 'calendar' ? 'Calendrier' : 'Équipe'}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#faf9f8]">
              {loading ? (
                <div className="flex h-full items-center justify-center text-stone-400 font-medium animate-pulse">Synchronisation...</div>
              ) : (
                <>
                  {/* TAB: DASHBOARD */}
                  <div className={`flex-1 overflow-y-auto p-4 sm:p-8 ${activeTab === "dashboard" ? "block animate-fade-in" : "hidden"}`}>
                    <div className="max-w-6xl mx-auto space-y-6">
                      
                      {/* Bannière */}
                      <div className="bg-gradient-to-br from-amber-400 to-amber-500 p-8 rounded-3xl shadow-sm text-stone-900 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                          <div>
                            <p className="text-amber-900 text-xs font-bold uppercase tracking-widest mb-3">{dynamicNextDeliveryDate}</p>
                            <h2 className="text-4xl sm:text-5xl leading-tight tracking-tight mb-4 font-serif">
                              C'est au tour de<br/>
                              <span className="italic font-bold">{currentEntry ? currentEntry.name : "Personne"}</span>
                            </h2>
                            {nextEntry && (
                              <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30 inline-flex items-center gap-2">
                                <span className="text-[10px] uppercase font-bold text-amber-900/70">Suivi de :</span>
                                <span className="text-sm font-bold text-stone-900">{nextEntry.name}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 bg-white/20 backdrop-blur-md p-1.5 rounded-xl border border-white/30">
                             <button onClick={goBackTurn} className="px-3 py-2 rounded-lg bg-white/40 hover:bg-white/60 text-stone-900 text-xs font-bold transition-colors flex items-center gap-1.5">
                               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                               Précédent
                             </button>
                             {nextEntry && (
                               <button onClick={() => skipTurn(nextEntry.id, nextEntry.name)} className="px-3 py-2 rounded-lg bg-white text-stone-900 shadow-sm hover:shadow text-xs font-bold transition-all flex items-center gap-1.5">
                                 Suivant
                                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                               </button>
                             )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Carte Total Pâtisseries */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col">
                          <div className="flex justify-between items-center mb-6">
                             <div>
                               <h3 className="text-lg font-bold text-stone-900 tracking-tight">Total Pâtisseries</h3>
                               <p className="text-sm text-stone-500">Pour le {cleanCurrentDate}</p>
                             </div>
                             <span className="text-6xl text-stone-900 leading-none font-serif">{totalPastries}</span>
                          </div>
                          
                          <div className="flex flex-col gap-3 flex-1 justify-center">
                            {workspacePastries.map((p, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-stone-50 rounded-2xl border border-stone-100 py-4 px-5 transition-transform hover:scale-105">
                                <div className="flex items-center gap-3">
                                   <span className="text-2xl">{p.emoji}</span>
                                   <span className="text-sm font-bold text-stone-700 uppercase truncate" title={p.name}>{p.name}</span>
                                </div>
                                <span className="font-black text-2xl text-stone-800">{counts[p.name] || 0}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Carte Répartition par Equipe */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 flex flex-col">
                          <h3 className="text-lg font-bold text-stone-900 tracking-tight mb-1">Répartition par Equipe</h3>
                          <p className="text-sm text-stone-500 mb-6">Vue détaillée pour la distribution</p>
                          <div className="space-y-0 overflow-y-auto pr-2 custom-scrollbar flex-1">
                            {Object.values(breakdownByTeam).map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center py-5 border-b-2 border-stone-100 last:border-0 last:pb-0">
                                <div className="flex items-center gap-4">
                                  <div className="bg-stone-50 text-stone-800 py-3 w-14 rounded-xl text-center border border-stone-200 flex items-center justify-center">
                                    <span className="text-2xl">{item.team.emoji}</span>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <span className="font-bold text-stone-800 text-lg">{item.team.name}</span>
                                    <span className="flex flex-wrap gap-2">
                                      {workspacePastries.map(p => item.counts[p.name] > 0 ? (
                                        <span key={p.name} className="inline-flex items-center gap-1 bg-stone-50 px-2 py-1.5 rounded-lg border border-stone-100 text-xs font-bold text-stone-600 shadow-sm">
                                          <span className="text-sm">{p.emoji}</span> {item.counts[p.name]}
                                        </span>
                                      ) : null)}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-3xl sm:text-4xl text-stone-900 leading-none font-serif">{item.total}</span>
                              </div>
                            ))}
                            {Object.values(breakdownByTeam).length === 0 && <p className="text-sm text-stone-400 text-center py-4">Aucune donnée pour cette semaine.</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TAB: CALENDAR */}
                  <div className={`flex-1 p-4 sm:p-8 flex flex-col min-h-0 ${activeTab === "calendar" ? "block animate-fade-in" : "hidden"}`}>
                    <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col lg:flex-row gap-8">
                      
                      {/* COLONNE GAUCHE (Liste de festins + Filtre jour) */}
                      <div className="lg:w-1/3 flex flex-col h-full gap-6">
                        <div className="mb-2 shrink-0">
                           <h2 className="text-4xl sm:text-5xl text-stone-900 leading-tight tracking-tight font-serif">Calendrier</h2>
                        </div>
                        
                        <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between gap-4 shrink-0">
                          <span className="text-sm font-bold text-stone-500 whitespace-nowrap">Jour de festin :</span>
                          <div className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 flex-1 flex items-center">
                            <select value={deliveryDay} onChange={handleDeliveryDayChange} className="w-full bg-transparent text-stone-800 text-sm font-medium focus:outline-none cursor-pointer appearance-none">
                              <option value={1}>Lundi</option>
                              <option value={2}>Mardi</option>
                              <option value={3}>Mercredi</option>
                              <option value={4}>Jeudi</option>
                              <option value={5}>Vendredi</option>
                            </select>
                            <svg className="w-4 h-4 text-stone-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>

                        {/* Liste uniquement des festins A VENIR */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                          {upcomingDeliveries.length > 0 ? upcomingDeliveries.slice(0, 15).map((item, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between group hover:border-amber-200 transition-colors">
                              <div className="flex items-center gap-5">
                                <div className="bg-stone-50 text-stone-800 py-2 w-16 rounded-xl text-center border border-stone-100 group-hover:bg-amber-50 group-hover:border-amber-100 group-hover:text-amber-900 transition-colors">
                                  <p className="text-[10px] font-bold uppercase tracking-wider">{item.date.toLocaleDateString("fr-FR", { month: "short" })}</p>
                                  <p className="text-xl font-black">{item.date.getDate()}</p>
                                </div>
                                <div>
                                  <p className="font-bold text-stone-900 text-lg mb-2">{item.name}</p>
                                  <p className="flex flex-wrap gap-2">
                                    {workspacePastries.map(p => item.counts[p.name] > 0 ? (
                                      <span key={p.name} className="inline-flex items-center gap-1.5 mr-1 bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-100 text-sm font-bold text-stone-600 shadow-sm">
                                        <span>{p.emoji}</span>{item.counts[p.name]}
                                      </span>
                                    ) : null)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-center justify-center px-2">
                                <p className="text-4xl text-stone-900 leading-none font-serif">{item.count}</p>
                                <span className="text-[10px] mt-1 text-stone-400 font-bold uppercase tracking-widest">Total</span>
                              </div>
                            </div>
                          )) : (
                            <div className="text-center text-stone-400 font-medium py-12 bg-white rounded-3xl border border-stone-100 border-dashed">Aucun festin prévu.</div>
                          )}
                        </div>
                      </div>

                      {/* COLONNE DROITE (Grille 5 jours) - overflow-visible pour les tooltips */}
                      <div className="lg:w-2/3 flex flex-col h-full bg-white border border-stone-200 rounded-3xl shadow-sm overflow-visible">
                        
                        {/* Header Grille */}
                        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-stone-100 shrink-0 bg-white rounded-t-3xl relative z-10">
                          <h2 className="text-3xl sm:text-4xl text-stone-900 leading-tight tracking-tight capitalize font-serif">
                            {currentMonthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                          </h2>
                          <div className="flex gap-1 bg-stone-50 border border-stone-200 p-1 rounded-xl">
                            <button onClick={prevMonth} className="p-2 text-stone-500 hover:bg-white hover:text-stone-900 hover:shadow-sm rounded-lg transition-all">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                            </button>
                            <button onClick={nextMonth} className="p-2 text-stone-500 hover:bg-white hover:text-stone-900 hover:shadow-sm rounded-lg transition-all">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                            </button>
                          </div>
                        </div>

                        {/* Grille sans débordement caché pour libérer les tooltips */}
                        <div className="flex-1 flex flex-col min-h-0 bg-stone-200 gap-px rounded-b-3xl">
                          <div className="grid grid-cols-5 bg-stone-50 gap-px shrink-0">
                            {["Lun", "Mar", "Mer", "Jeu", "Ven"].map((day) => (
                              <div key={day} className="py-2 sm:py-3 bg-white text-center text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest">
                                {day}
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex-1 grid grid-cols-5 grid-rows-6 gap-px rounded-b-3xl">
                            {generateGridDays().map((dayObj, i) => {
                              const isToday = isSameDay(dayObj.date, new Date());
                              const isPast = dayObj.date < todayMidnight && !isToday;
                              const deliveryForDay = calendarData.find(d => isSameDay(d.date, dayObj.date));
                              
                              const absencesForDay = getAbsencesForDay(dayObj.date);
                              const count = absencesForDay.length;

                              // Ligne d'absence continue : le badge n'apparaît qu'au changement
                              let isStart = false;
                              let isEnd = false;

                              if (count > 0) {
                                // Jour ouvré précédent
                                const prevWorkingDay = new Date(dayObj.date);
                                prevWorkingDay.setDate(prevWorkingDay.getDate() - (dayObj.date.getDay() === 1 ? 3 : 1));
                                const prevCount = getAbsencesForDay(prevWorkingDay).length;

                                // Jour ouvré suivant
                                const nextWorkingDay = new Date(dayObj.date);
                                nextWorkingDay.setDate(nextWorkingDay.getDate() + (dayObj.date.getDay() === 5 ? 3 : 1));
                                const nextCount = getAbsencesForDay(nextWorkingDay).length;

                                isStart = count !== prevCount;
                                isEnd = count !== nextCount;
                              }

                              // Définition de l'emplacement dynamique du tooltip pour qu'il ne soit JAMAIS coupé
                              const colIndex = i % 5;
                              const rowIndex = Math.floor(i / 5);
                              
                              let tooltipClasses = "";
                              let pointerClasses = "";
                              
                              // Vertical (Si on est sur la 1ère ligne, le tooltip s'ouvre vers le BAS)
                              if (rowIndex === 0) {
                                tooltipClasses += "top-full mt-1.5 ";
                                pointerClasses += "bottom-full border-b-stone-800 ";
                              } else {
                                tooltipClasses += "bottom-full mb-1.5 ";
                                pointerClasses += "top-full border-t-stone-800 ";
                              }
                              // Horizontal (Si on est sur les bords, le tooltip s'aligne à l'intérieur)
                              if (colIndex === 0) {
                                tooltipClasses += "left-0 ";
                                pointerClasses += "left-4 ";
                              } else if (colIndex === 4) {
                                tooltipClasses += "right-0 ";
                                pointerClasses += "right-4 ";
                              } else {
                                tooltipClasses += "left-1/2 -translate-x-1/2 ";
                                pointerClasses += "left-1/2 -translate-x-1/2 ";
                              }

                              // Arrondis dynamiques pour les coins inférieurs de la grille
                              let roundedClasses = "";
                              if (i === 25) roundedClasses = "rounded-bl-3xl";
                              if (i === 29) roundedClasses = "rounded-br-3xl";

                              let cellClasses = `flex flex-col px-0 transition-colors relative z-10 hover:z-50 group/cell ${roundedClasses} `;
                              if (!dayObj.isCurrentMonth) {
                                cellClasses += 'bg-stone-100/50 opacity-60 ';
                              } else if (isToday) {
                                cellClasses += 'bg-amber-50 '; 
                              } else if (isPast) {
                                cellClasses += 'bg-stone-50 opacity-80 ';
                              } else {
                                cellClasses += 'bg-white ';
                              }

                              let dateNumClasses = 'text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ';
                              if (isToday) {
                                dateNumClasses += 'bg-amber-400 text-stone-900 shadow-sm';
                              } else if (!dayObj.isCurrentMonth || isPast) {
                                dateNumClasses += 'text-stone-400';
                              } else {
                                dateNumClasses += 'text-stone-700';
                              }

                              return (
                                <div key={i} className={cellClasses}>
                                  
                                  {/* Partie Haute : Numéro + Festin */}
                                  <div className="px-1.5 sm:px-2 pt-1.5 pb-0.5 flex flex-col gap-1 shrink-0">
                                    <div className="flex justify-end mb-0.5">
                                      <span className={dateNumClasses}>
                                        {dayObj.date.getDate()}
                                      </span>
                                    </div>
                                    <div className="h-7 sm:h-8">
                                      {deliveryForDay && (
                                        <div className="bg-amber-100 border border-amber-200 rounded-md px-1.5 py-1 flex items-center shadow-sm relative z-20 h-full">
                                          <span className="text-[10px] sm:text-xs font-bold text-amber-900 truncate">🥐 {deliveryForDay.name}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Partie Basse : Ligne d'absences continue */}
                                  {count > 0 && (
                                    <div className="mt-auto flex flex-col justify-end relative group cursor-help pb-2 h-8">
                                      <div className={`absolute bottom-1.5 left-0 right-0 h-6 flex items-center bg-orange-100/90 transition-colors group-hover:bg-orange-200/90 
                                        ${isStart ? 'ml-1.5 sm:ml-2 rounded-l-full' : 'ml-0 rounded-l-none'} 
                                        ${isEnd ? 'mr-1.5 sm:mr-2 rounded-r-full' : 'mr-0 rounded-r-none'}
                                      `}>
                                        {isStart ? (
                                          <div className="flex items-center gap-1.5 sm:gap-2 pl-0.5 sm:pl-1 w-full overflow-hidden">
                                            <span className="w-5 h-5 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                                              {count}
                                            </span>
                                            <span className="text-[9px] sm:text-[10px] font-semibold text-orange-800 pr-2 truncate">
                                              Absent{count > 1 ? 's' : ''}
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="w-full h-full"></div>
                                        )}
                                      </div>

                                      {/* Infobulle Intelligente (Ne coupe plus !) */}
                                      <div className={`absolute ${tooltipClasses} hidden group-hover:flex flex-col gap-1 bg-stone-800 text-white text-xs px-3 py-2.5 rounded-xl shadow-xl z-[100] min-w-[140px] pointer-events-none`}>
                                        <span className="text-[9px] text-stone-400 uppercase tracking-widest font-bold mb-1 border-b border-stone-700 pb-1.5">
                                          Absents le {dayObj.date.toLocaleDateString("fr-FR", {day: "numeric", month: "long"})}
                                        </span>
                                        {absencesForDay.map(a => (
                                          <span key={a.id} className="font-medium flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span> {a.name}
                                          </span>
                                        ))}
                                        <div className={`absolute ${pointerClasses} border-[5px] border-transparent`}></div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TAB: TEAM */}
                  <div className={`flex-1 p-4 sm:p-8 flex flex-col ${activeTab === "team" ? "block animate-fade-in" : "hidden"} overflow-y-auto lg:overflow-hidden`}>
                    
                    <div className="max-w-6xl mx-auto w-full h-auto lg:h-full flex flex-col lg:flex-row gap-6">
                      
                      {/* COLONNE GAUCHE (Ajout Membre & Équipes) */}
                      <div className="lg:w-1/3 flex flex-col gap-6 lg:overflow-y-auto lg:custom-scrollbar lg:pr-1 lg:pb-4 shrink-0">
                        
                        {/* Ajout Membre */}
                        <div className="bg-white border border-stone-200 p-6 rounded-3xl shadow-sm">
                          <h3 className="text-lg font-bold tracking-tight mb-4 text-stone-900">Ajouter un membre</h3>
                          <form onSubmit={addMember} className="space-y-4">
                            <div>
                              <input type="text" placeholder="Prénom" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full border border-stone-200 p-3 rounded-xl text-sm bg-stone-50 text-stone-800 placeholder-stone-400 focus:ring-2 focus:ring-amber-400 outline-none transition-shadow" required />
                            </div>
                            <div>
                              <select value={newPreference} onChange={(e) => setNewPreference(e.target.value)} className="w-full border border-stone-200 p-3 rounded-xl text-sm bg-stone-50 text-stone-800 focus:ring-2 focus:ring-amber-400 outline-none transition-shadow" required>
                                {workspacePastries.map(p => <option key={p.name} value={p.name}>{p.emoji} {p.name}</option>)}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <select value={newTeamId} onChange={(e) => setNewTeamId(e.target.value)} className="flex-1 border border-stone-200 p-3 rounded-xl text-sm bg-stone-50 text-stone-800 focus:ring-2 focus:ring-amber-400 outline-none transition-shadow">
                                {teams.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
                              </select>
                              <button type="button" onClick={() => setShowTeamModal(true)} className="bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold px-4 rounded-xl transition-colors outline-none">+</button>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                               <input type="checkbox" id="isT" checked={newIsTemp} onChange={(e) => setNewIsTemp(e.target.checked)} className="w-4 h-4 text-amber-400 border-stone-300 bg-stone-50 rounded focus:ring-amber-400 outline-none" />
                               <label htmlFor="isT" className="text-sm text-stone-600 cursor-pointer select-none font-medium">Stagiaire / Externe</label>
                            </div>
                            {newIsTemp && (
                              <div className="pt-1 animate-fade-in">
                                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Date de départ</label>
                                <input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} className="w-full border border-stone-200 p-3 rounded-xl text-sm bg-stone-50 text-stone-800 focus:ring-2 focus:ring-amber-400 outline-none transition-shadow" required={newIsTemp} />
                              </div>
                            )}
                            <button type="submit" className="w-full bg-amber-400 text-stone-900 font-bold py-3 rounded-xl hover:bg-amber-300 transition-colors text-sm mt-2 shadow-sm">+ Ajouter</button>
                          </form>
                        </div>

                        {/* Gestion Bureaux */}
                        {teams.length > 0 && (
                          <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-200">
                            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Gérer les équipes</h4>
                            <div className="flex flex-col gap-2">
                              {teams.map(team => (
                                <div key={team.id} className="flex justify-between items-center p-2 rounded-xl hover:bg-stone-50 transition-colors group">
                                  
                                  <div className="flex items-center gap-3">
                                    <div className="bg-stone-100 p-2 rounded-xl text-lg no-underline leading-none">{team.emoji}</div>
                                    <span className="text-sm font-bold text-stone-800">{team.name}</span>
                                  </div>

                                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                    <button onClick={() => openEditTeam(team)} className="p-1.5 text-stone-400 hover:text-amber-500 rounded-md hover:bg-amber-50 transition-colors">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                    </button>
                                    <button onClick={() => handleDeleteTeam(team.id, team.name)} disabled={team.id === "default"} className={`p-1.5 rounded-md transition-colors ${team.id === "default" ? "text-stone-200 cursor-not-allowed" : "text-stone-400 hover:text-red-500 hover:bg-red-50"}`}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* COLONNE DROITE SCROLLABLE (Liste Membres) */}
                      <div className="lg:w-2/3 flex flex-col h-[500px] lg:h-auto lg:min-h-0 bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
                        
                        {/* Barre de filtres UX Mobile */}
                        <div className="p-4 border-b border-stone-100 flex flex-row items-center gap-3 sm:gap-4 bg-stone-50/50">
                          <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)} className="flex-1 w-full border border-stone-200 p-2 rounded-xl text-xs sm:text-sm bg-white focus:border-amber-400 focus:outline-none font-medium text-stone-600">
                            <option value="all">Tous les membres</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
                          </select>
                          <label className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-stone-500 cursor-pointer shrink-0 uppercase tracking-widest bg-white py-2 px-3 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
                            <input type="checkbox" checked={filterTemp} onChange={(e) => setFilterTemp(e.target.checked)} className="w-4 h-4 text-amber-400 border-stone-300 rounded focus:ring-amber-400" />
                            Stagiaires
                          </label>
                        </div>

                        {/* Contenu Liste */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                          {filteredUsers.length > 0 ? filteredUsers.map((user, index) => {
                            const isExpired = user.isTemp && user.endDate && parseLocalDate(user.endDate) < todayMidnight;
                            const isCurrentlyAbsent = isUserAbsentOn(user, todayMidnight);
                            const isInactive = isCurrentlyAbsent || isExpired;
                            const isEditing = user.id === editingUserId;
                            const userTeam = teams.find(t => t.id === user.teamId);

                            if (isEditing) return (
                              <div key={user.id} className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-inner space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border border-amber-200 p-3 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                                  <select value={editPreference} onChange={(e) => setEditPreference(e.target.value)} className="w-full border border-amber-200 p-3 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                                    {workspacePastries.map(p => <option key={p.name} value={p.name}>{p.emoji} {p.name}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <select value={editTeamId} onChange={(e) => setEditTeamId(e.target.value)} className="w-full border border-amber-200 p-3 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
                                  </select>
                                </div>
                                <div className="pt-3 border-t border-amber-200/50">
                                  <p className="text-xs font-bold text-amber-800/60 uppercase tracking-widest mb-3">Période d'absence</p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-[10px] font-bold text-amber-700/50 uppercase block mb-1">Début</label><input type="date" value={editAbsenceStart} onChange={(e) => setEditAbsenceStart(e.target.value)} className="w-full border border-amber-200 p-2.5 rounded-xl text-xs bg-white text-stone-700" /></div>
                                    <div><label className="text-[10px] font-bold text-amber-700/50 uppercase block mb-1">Fin</label><input type="date" value={editAbsenceEnd} onChange={(e) => setEditAbsenceEnd(e.target.value)} className="w-full border border-amber-200 p-2.5 rounded-xl text-xs bg-white text-stone-700" /></div>
                                  </div>
                                </div>
                                {user.isTemp && (
                                  <div className="pt-3 border-t border-amber-200/50">
                                    <label className="text-[10px] font-bold text-amber-800/60 uppercase tracking-widest block mb-2">Fin de contrat</label>
                                    <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className="w-full border border-amber-200 p-2.5 rounded-xl text-xs bg-white text-stone-700" />
                                  </div>
                                )}
                                <div className="flex justify-between pt-2">
                                  <button onClick={() => deleteMember(user.id, user.name)} className="text-xs bg-red-100 text-red-600 hover:bg-red-200 px-4 py-3 rounded-xl font-bold transition-colors">Retirer</button>
                                  <div className="flex gap-2">
                                    <button onClick={() => setEditingUserId(null)} className="text-xs bg-white border border-amber-200 text-stone-600 px-4 py-3 rounded-xl font-bold hover:bg-stone-50 transition-colors">Annuler</button>
                                    <button onClick={() => updateMember(user.id)} className="text-xs bg-amber-400 text-stone-900 px-5 py-3 rounded-xl font-bold shadow-sm hover:bg-amber-500 transition-colors">Sauver</button>
                                  </div>
                                </div>
                              </div>
                            );

                            const matchedPastryObj = workspacePastries.find(p => p.name === user.preference);

                            return (
                              <div key={user.id} className={`flex items-center justify-between py-4 px-5 rounded-2xl border transition-all ${isInactive ? "bg-stone-50 border-stone-100 opacity-60 grayscale-[0.2]" : "bg-white hover:border-amber-200 border-stone-100 shadow-sm"}`}>
                                <div className="flex items-center gap-4">
                                  
                                  {/* Flèches */}
                                  <div className="flex flex-col bg-stone-50 rounded-lg border border-stone-200/60 shadow-sm overflow-hidden shrink-0">
                                    <button onClick={() => moveUser(index, -1)} disabled={index === 0 || filterTeam !== "all" || filterTemp} className="p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-800 disabled:opacity-30 transition-colors flex justify-center items-center">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                                    </button>
                                    <div className="h-px bg-stone-200/60 w-full"></div>
                                    <button onClick={() => moveUser(index, 1)} disabled={index === users.length - 1 || filterTeam !== "all" || filterTemp} className="p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-800 disabled:opacity-30 transition-colors flex justify-center items-center">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                    </button>
                                  </div>
                                  
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-3 mb-1.5">
                                      <span className="font-bold text-stone-800 text-xl">{user.name}</span>
                                      {user.isTemp && <span className="text-[9px] uppercase tracking-widest font-bold bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-md border border-indigo-100">Temp</span>}
                                      {userTeam && <span className="text-xs font-bold bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full border border-stone-200 flex items-center gap-1.5" title={userTeam.name}><span>{userTeam.emoji}</span> {userTeam.name}</span>}
                                    </div>
                                    <div className="mb-1">
                                      <span className="bg-stone-100 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase text-stone-600 border border-stone-200/50 inline-flex items-center gap-1">
                                        {matchedPastryObj ? `${matchedPastryObj.emoji} ${user.preference}` : user.preference}
                                      </span>
                                    </div>
                                    {isCurrentlyAbsent && (
                                      <div className="text-xs font-medium mt-0.5">
                                        <span className="text-amber-500 font-bold">En congés</span>
                                      </div>
                                    )}
                                  </div>

                                </div>
                                <div className="flex items-center gap-4">
                                  <span className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border hidden sm:inline-block uppercase tracking-widest ${isExpired ? "bg-stone-200 text-stone-500 border-stone-300" : isCurrentlyAbsent ? "bg-stone-200 text-stone-500 border-stone-300" : "bg-amber-100 text-amber-700 border-amber-200"}`}>{isExpired ? "Fini" : isCurrentlyAbsent ? "Absent" : "Présent"}</span>
                                  <button onClick={() => { setEditingUserId(user.id); setEditName(user.name); setEditPreference(user.preference); setEditTeamId(user.teamId); setEditAbsenceStart(user.absenceStart || ""); setEditAbsenceEnd(user.absenceEnd || ""); setEditEndDate(user.endDate || ""); }} className="p-2.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-100">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                  </button>
                                </div>
                              </div>
                            );
                          }) : (
                            <div className="text-center text-stone-400 font-medium py-16 px-4 bg-stone-50 rounded-2xl border border-stone-100 border-dashed">Aucun membre ne correspond à votre recherche.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>
      
      {/* Composant Modale Équipes */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveTeam} className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 space-y-5 animate-fade-in relative border border-stone-100">
            <h3 className="text-xl font-black text-stone-900 tracking-tight">{editingTeamId ? "Modifier l'équipe" : "Nouveau Bureau"}</h3>
            <div className="flex gap-3">
              <div className="w-16">
                 <input type="text" value={teamFormEmoji} onChange={(e) => setTeamFormEmoji(e.target.value)} placeholder="📢" maxLength={2} className="w-full text-center border border-stone-200 p-3 rounded-xl text-xl bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none" required />
              </div>
              <div className="flex-1">
                 <input type="text" placeholder="Nom du bureau" value={teamFormName} onChange={(e) => setTeamFormName(e.target.value)} className="w-full border border-stone-200 p-3 rounded-xl text-sm font-medium bg-stone-50 focus:ring-2 focus:ring-amber-400 focus:outline-none text-stone-800" required />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowTeamModal(false)} className="flex-1 bg-stone-100 text-stone-600 font-bold py-3 rounded-xl hover:bg-stone-200 transition-colors">Annuler</button>
              <button type="submit" className="flex-1 bg-amber-400 text-stone-900 font-bold py-3 rounded-xl shadow-sm hover:bg-amber-300 transition-all">Enregistrer</button>
            </div>
          </form>
        </div>
      )}

      {/* Styles globaux */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Urbanist:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
        .font-app { font-family: 'Urbanist', sans-serif; }
        .font-serif { font-family: 'Times New Roman', Times, serif; font-weight: normal !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #d1d5db; }
        .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
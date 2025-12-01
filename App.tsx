

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { v4 as uuidv4 } from 'uuid';
import { Sparkles, LayoutPanelLeft, FileUp, LayoutGrid, X, Download } from 'lucide-react';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import FormCanvas from './components/FormCanvas';
import PropertiesPanel from './components/PropertiesPanel';
import AIAssistant from './components/AIAssistant';
import MediaCaptureModal from './components/MediaCaptureModal';
import PreviewModal from './components/PreviewModal';
import SettingsModal from './components/SettingsModal';
import ProjectsModal from './components/ProjectsModal';
import TemplatesModal from './components/TemplatesModal';
import DocumentationModal from './components/DocumentationModal';
import ConfirmationModal from './components/ConfirmationModal';
import { projectService } from './services/projectService';
import { useGeminiService } from './services/geminiService';
import { QuestionType, FormElement, Project, User } from './types';
import { LocalizationProvider, useLocalization } from './services/localizationService';
import { useFormTemplates } from './hooks/useFormTemplates';

declare var XLSX: any;

// --- Client-Side Authentication Service ---
const authService = {
    signup: async (name: string, email: string, password: string, profession: string): Promise<User> => {
        const users = JSON.parse(localStorage.getItem('kobo-form-builder-users') || '[]');
        if (users.some((u: any) => u.email === email)) {
            throw new Error("auth.errors.userExists");
        }
        const newUser = { id: `user_${Date.now()}`, name, email, password, profession }; // Storing plain password for simplicity
        users.push(newUser);
        localStorage.setItem('kobo-form-builder-users', JSON.stringify(users));
        return { id: newUser.id, name: newUser.name, email: newUser.email, profession: newUser.profession };
    },
    login: async (email: string, password: string): Promise<User> => {
        const users = JSON.parse(localStorage.getItem('kobo-form-builder-users') || '[]');
        const user = users.find((u: any) => u.email === email && u.password === password);
        if (user) {
            const userData: User = { id: user.id, name: user.name, email: user.email, profession: user.profession };
            localStorage.setItem('kobo-form-builder-current-user', JSON.stringify(userData));
            return userData;
        }
        throw new Error("auth.errors.invalidCredentials");
    },
    logout: async (): Promise<void> => {
        localStorage.removeItem('kobo-form-builder-current-user');
    },
    getCurrentUser: async (): Promise<User | null> => {
        const userJson = localStorage.getItem('kobo-form-builder-current-user');
        return userJson ? JSON.parse(userJson) : null;
    }
};

const AuthModal: React.FC<{
    initialMode: 'login' | 'signup';
    onClose: () => void;
    onLogin: (email: string, pass: string) => Promise<void>;
    onSignup: (name: string, email: string, pass: string, profession: string) => Promise<void>;
}> = ({ initialMode, onClose, onLogin, onSignup }) => {
    const { t } = useLocalization();
    const [isLoginView, setIsLoginView] = useState(initialMode === 'login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [profession, setProfession] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoginView(initialMode === 'login');
    }, [initialMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isLoginView) {
                await onLogin(email, password);
            } else {
                await onSignup(name, email, password, profession);
            }
            onClose();
        } catch (err: any) {
             const message = err.message || t('auth.errors.unexpected');
             setError(t(message, message));
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in-up" onClick={onClose}>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-8" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors" aria-label={t('common.close')}>
                    <X className="w-6 h-6" />
                </button>
                <div className="text-center mb-8">
                     <h2 className="text-3xl font-bold text-slate-800">{isLoginView ? t('auth.welcomeBack') : t('auth.createAccount')}</h2>
                     <p className="text-slate-500 mt-2">{isLoginView ? t('auth.loginSubtitle') : t('auth.signupSubtitle')}</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-5">
                        {!isLoginView && (
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1" htmlFor="name">{t('auth.fullName')}</label>
                                <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition text-slate-900" required />
                            </div>
                        )}
                         {!isLoginView && (
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1" htmlFor="profession">{t('auth.profession')}</label>
                                <input id="profession" type="text" value={profession} onChange={e => setProfession(e.target.value)} placeholder={t('auth.professionPlaceholder')} className="w-full px-3 py-2 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition text-slate-900" />
                            </div>
                        )}
                         <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1" htmlFor="email">{t('auth.email')}</label>
                            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition text-slate-900" required />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1" htmlFor="password">{t('auth.password')}</label>
                            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition text-slate-900" required />
                             {isLoginView && (
                                <div className="text-right mt-2">
                                    <button type="button" className="text-sm font-medium text-slate-500 hover:text-brand-600 hover:underline">
                                        {t('auth.forgotPassword')}
                                    </button>
                                </div>
                            )}
                         </div>
                    </div>
                    {error && <p className="text-red-600 text-sm mt-4 text-center">{error}</p>}
                    <div className="mt-8">
                        <button type="submit" disabled={isLoading} className="w-full py-3 text-white font-bold bg-slate-800 rounded-lg hover:bg-slate-900 disabled:bg-slate-500 uppercase tracking-wider transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                             {isLoading ? t('auth.processing') : (isLoginView ? t('auth.loginButton') : t('auth.createAccountButton'))}
                        </button>
                    </div>
                    <p className="text-center text-sm text-slate-500 mt-6">
                        {isLoginView ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
                        <button type="button" onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="font-semibold text-slate-700 hover:underline">
                            {isLoginView ? t('auth.signUp') : t('auth.logIn')}
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
};

const LandingPage: React.FC<{onLoginClick: () => void, onSignupClick: () => void, onAIAssistantClick: () => void}> = ({ onLoginClick, onSignupClick, onAIAssistantClick }) => {
    const { t } = useLocalization();
    
    const featureIcons: { [key: string]: React.ElementType } = {
        ai: Sparkles,
        visual: LayoutPanelLeft,
        import: FileUp,
        templates: LayoutGrid,
    };

    return (
        <div className="w-full min-h-screen bg-white text-slate-800 font-sans">
            <header className="px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <img src="assets/icon.svg" className="w-8 h-8" alt="KoboFormBuilder Icon" />
                    <span className="text-xl font-bold text-black">KoboFormBuilder</span>
                </div>
                <nav className="flex items-center gap-2">
                    <button onClick={onLoginClick} className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-md transition-colors">{t('auth.logIn')}</button>
                    <button onClick={onSignupClick} className="px-5 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-md shadow-sm transition-all duration-200 transform hover:scale-105">{t('landing.signUpFree')}</button>
                </nav>
            </header>
            <main className="text-center pt-20 pb-24 px-4">
                 <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-tight" dangerouslySetInnerHTML={{__html: t('landing.heroTitle')}}></h1>
                <p className="max-w-2xl mx-auto mt-6 text-lg text-slate-600">{t('landing.heroSubtitle')}</p>
                <button onClick={onSignupClick} className="mt-10 px-8 py-4 text-lg font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-slate-500/50">{t('landing.startBuilding')}</button>
            </main>
            <section className="bg-slate-50/70 py-24 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-slate-900">{t('landing.smarterWayTitle')}</h2>
                        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">{t('landing.smarterWaySubtitle')}</p>
                    </div>
                     <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {(Object.entries(t('landing.features')) as [string, any][]).map(([key, feature]) => {
                             const Icon = featureIcons[key];
                             return (
                                 <div key={feature.title} className="bg-white p-8 rounded-xl border border-slate-200/80 shadow-sm text-left transition-transform duration-300 hover:-translate-y-2">
                                     {Icon && <Icon className="w-8 h-8 text-slate-800 mb-5" />}
                                     <h3 className="text-xl font-bold text-slate-900">{feature.title}</h3>
                                     <p className="mt-2 text-slate-600">{feature.description}</p>
                                 </div>
                             );
                        })}
                    </div>
                </div>
            </section>
            
            <footer className="py-8 px-4 text-center border-t border-slate-200 bg-white">
                <div className="max-w-7xl mx-auto">
                    <p className="text-sm text-slate-600">{t('landing.footer.designerCredit')}</p>
                </div>
            </footer>

            <button onClick={onAIAssistantClick} className="fixed bottom-6 right-6 bg-slate-800 text-white px-4 py-3 rounded-full shadow-lg hover:bg-slate-900 transition-all duration-300 transform hover:scale-110 flex items-center gap-2 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold text-sm">{t('ai.title')}</span>
            </button>
        </div>
    )
}

const AppContent: React.FC = () => {
    const { language, setLanguage, t } = useLocalization();
    const { generateQuestionsFromTextPrompt, generateQuestionsFromFile } = useGeminiService();
    const FORM_TEMPLATES = useFormTemplates();
    
    // Auth State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(true);
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
    const [showAuthModal, setShowAuthModal] = useState(false);
    
    // Project State
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // UI State
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [isImporting, setIsImporting] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [autosaveEnabled, setAutosaveEnabled] = useState(true);
    const [isExportConfirmVisible, setIsExportConfirmVisible] = useState(false);
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);
    const [isProjectsVisible, setIsProjectsVisible] = useState(false);
    const [isTemplatesVisible, setIsTemplatesVisible] = useState(false);
    const [isDocsVisible, setIsDocsVisible] = useState(false);
    const [mediaCaptureInfo, setMediaCaptureInfo] = useState<{ elementId: string; type: QuestionType } | null>(null);
    const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
    const [aiCorrectionTargetId, setAiCorrectionTargetId] = useState<string | null>(null);
    const [tempGeneratedElements, setTempGeneratedElements] = useState<Partial<FormElement>[] | null>(null);

    const debouncedSave = useRef<ReturnType<typeof setTimeout>>();

    // --- Effects ---
    useEffect(() => {
        const checkUser = async () => {
            const user = await authService.getCurrentUser();
            setCurrentUser(user);
            setIsAuthenticating(false);
        };
        checkUser();

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (currentUser) {
            loadProjectsAndLastOpen(currentUser.id);
        }
    }, [currentUser]);

    useEffect(() => {
        if (!currentProject || !autosaveEnabled || !isOnline || !currentUser) return;
        if (debouncedSave.current) clearTimeout(debouncedSave.current);
        debouncedSave.current = setTimeout(() => {
            projectService.saveProject({ ...currentProject, updatedAt: new Date().toISOString() }, currentUser.id)
                .then(updatedProjects => setProjects(updatedProjects))
                .catch(err => console.error("Auto-save failed:", err));
        }, 2000);
        return () => {
            if (debouncedSave.current) clearTimeout(debouncedSave.current);
        };
    }, [currentProject, autosaveEnabled, isOnline, currentUser]);
    
    // --- Auth Handlers ---
    const handleLogin = async (email: string, pass: string) => {
        const user = await authService.login(email, pass);
        setCurrentUser(user);
    };
    const handleSignup = async (name: string, email: string, pass: string, profession: string) => {
        const user = await authService.signup(name, email, pass, profession);
        setCurrentUser(user);
    };
    const handleLogout = async () => {
        await authService.logout();
        setCurrentUser(null);
        setCurrentProject(null);
        setProjects([]);
    };

    // --- Element Handlers ---
    const findElement = (elements: FormElement[], id: string): { element: FormElement, parent: FormElement[], index: number } | null => {
        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            if (el.id === id) return { element: el, parent: elements, index: i };
            if (el.children) {
                const found = findElement(el.children, id);
                if (found) return found;
            }
        }
        return null;
    };
    
    // --- Project Handlers ---
    const loadProjectsAndLastOpen = async (userId: string) => {
        const userProjects = await projectService.getProjects(userId);
        setProjects(userProjects);
        const lastId = await projectService.getLastOpenedProjectId(userId);
        
        let projectToOpen = userProjects.find(p => p.id === lastId);

        if (!projectToOpen && userProjects.length > 0) {
            projectToOpen = userProjects[0];
        }

        if (projectToOpen) {
            setCurrentProject(projectToOpen);
            projectService.setLastOpenedProjectId(projectToOpen.id, userId);
            setSelectedElementId(null);
            setIsProjectsVisible(false);
        } else {
            handleNewProject();
        }
    };

    const handleNewProject = () => {
        if (!currentUser) return;
        const newProject: Project = {
            id: uuidv4(),
            title: t('projects.newProjectTitle'),
            language: language,
            elements: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            endOfFormMessage: t('preview.defaultEndMessage'),
        };
        setCurrentProject(newProject);
        projectService.saveProject(newProject, currentUser.id).then(setProjects);
        setSelectedElementId(null);
        setIsProjectsVisible(false);
    };

    const handleOpenProject = (projectId: string) => {
        const projectToOpen = projects.find(p => p.id === projectId);
        if (projectToOpen && currentUser) {
            setCurrentProject(projectToOpen);
            projectService.setLastOpenedProjectId(projectId, currentUser.id);
            setSelectedElementId(null);
            setIsProjectsVisible(false);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!currentUser) return;
        const updatedProjects = await projectService.deleteProject(projectId, currentUser.id);
        setProjects(updatedProjects);
        if (currentProject?.id === projectId) {
            if (updatedProjects.length > 0) {
                handleOpenProject(updatedProjects[0].id);
            } else {
                handleNewProject();
            }
        }
    };

    const handleSaveProject = async () => {
        if (!currentProject || !currentUser || saveStatus === 'saving') return;
        setSaveStatus('saving');
        try {
            const projectToSave = { ...currentProject, updatedAt: new Date().toISOString() };
            const updatedProjects = await projectService.saveProject(projectToSave, currentUser.id);
            setProjects(updatedProjects);
            setCurrentProject(projectToSave);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Failed to manually save project:", error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }
    };
    
    // --- Form Handlers ---
    const updateCurrentProject = useCallback((updates: Partial<Project>) => {
        setCurrentProject(prev => prev ? { ...prev, ...updates } : null);
    }, []);
    const handleFormTitleChange = (title: string) => updateCurrentProject({ title });
    const handleFormLanguageChange = (language: string) => updateCurrentProject({ language });
    const handleEndOfFormMessageChange = (endOfFormMessage: string) => updateCurrentProject({ endOfFormMessage });

    // --- Element Handlers ---
    const recursiveUpdate = (elements: FormElement[], id: string, updates: Partial<FormElement>): FormElement[] => {
        return elements.map(el => {
            if (el.id === id) return { ...el, ...updates };
            if (el.children) return { ...el, children: recursiveUpdate(el.children, id, updates) };
            return el;
        });
    };

    const handleUpdateElement = (id: string, updates: Partial<FormElement>) => {
        if (!currentProject) return;
        const newElements = recursiveUpdate(currentProject.elements, id, updates);
        updateCurrentProject({ elements: newElements });
    };
    
    const handleAddElements = useCallback((newElements: Partial<FormElement>[]) => {
        if (!currentProject) return;
        const completeElements: FormElement[] = newElements.map((el, i) => ({
            id: uuidv4(),
            type: el.type || QuestionType.TEXT,
            name: el.name || `${el.type || 'q'}_${Date.now() + i}`,
            label: el.label || t('canvas.untitledLabel'),
            ...el,
            choices: (el.choices || []).map(c => ({...c, id: uuidv4()})),
        }));
        updateCurrentProject({ elements: [...currentProject.elements, ...completeElements] });
    }, [currentProject, t, updateCurrentProject]);

    useEffect(() => {
        if (currentProject && tempGeneratedElements) {
            handleAddElements(tempGeneratedElements);
            setTempGeneratedElements(null);
        }
    }, [currentProject, tempGeneratedElements, handleAddElements]);

    const handleAddElement = (type: QuestionType, parentId?: string | null, index?: number) => {
        if (!currentProject) return;
        const newElement: FormElement = {
            id: uuidv4(),
            type,
            name: `${type}_${Date.now()}`,
            label: t('canvas.newQuestionLabel', { type }),
            choices: (type === QuestionType.SELECT_ONE || type === QuestionType.SELECT_MULTIPLE) ? [{id: uuidv4(), name: 'choice1', label: 'Choice 1'}] : undefined,
            children: (type === QuestionType.GROUP || type === QuestionType.REPEAT) ? [] : undefined,
        };
        
        let newElements = [...currentProject.elements];
        if (parentId) {
             const addRecursive = (els: FormElement[]): FormElement[] => els.map(el => {
                if (el.id === parentId && el.children) {
                    const newChildren = [...el.children];
                    newChildren.splice(index!, 0, newElement);
                    return {...el, children: newChildren};
                }
                if (el.children) return {...el, children: addRecursive(el.children)};
                return el;
             });
             newElements = addRecursive(newElements);
        } else {
             newElements.splice(index !== undefined ? index : newElements.length, 0, newElement);
        }
        updateCurrentProject({ elements: newElements });
        setSelectedElementId(newElement.id);
    };

    const handleDeleteElement = (id: string) => {
        if (!currentProject) return;
        const deleteRecursive = (elements: FormElement[], idToDelete: string): FormElement[] => {
            return elements.filter(el => el.id !== idToDelete).map(el => {
                if (el.children) {
                    return {...el, children: deleteRecursive(el.children, idToDelete) };
                }
                return el;
            });
        };
        updateCurrentProject({ elements: deleteRecursive(currentProject.elements, id) });
        if (selectedElementId === id) setSelectedElementId(null);
    };
    
    const handleDuplicateElement = (id: string) => {
        if (!currentProject) return;
        const found = findElement(currentProject.elements, id);
        if (!found) return;
        const { element, parent, index } = found;
        const duplicateId = (el: FormElement): FormElement => ({
            ...el,
            id: uuidv4(),
            name: `${el.name}_copy`,
            children: el.children ? el.children.map(duplicateId) : undefined,
            choices: el.choices ? el.choices.map(c => ({...c, id: uuidv4()})) : undefined,
        });
        const newElement = duplicateId(element);
        parent.splice(index + 1, 0, newElement);
        updateCurrentProject({ elements: [...currentProject.elements]});
    };
    
    const handleMoveElement = (dragId: string, dropTarget: { parentId: string | null; index: number }) => {
        if (!currentProject) return;
        let newElements = [...currentProject.elements];
        const found = findElement(newElements, dragId);
        if (!found) return;

        found.parent.splice(found.index, 1);
        
        if (dropTarget.parentId) {
            const addRecursive = (els: FormElement[]): FormElement[] => els.map(el => {
                if (el.id === dropTarget.parentId && el.children) {
                    const newChildren = [...el.children];
                    newChildren.splice(dropTarget.index, 0, found.element);
                    return {...el, children: newChildren};
                }
                if (el.children) return {...el, children: addRecursive(el.children)};
                return el;
             });
             newElements = addRecursive(newElements);
        } else {
            newElements.splice(dropTarget.index, 0, found.element);
        }
        updateCurrentProject({ elements: newElements });
    };

    const handleSelectElement = (id: string) => setSelectedElementId(id);
    const handleClearSelection = () => setSelectedElementId(null);
    
    // --- File/Template Handlers ---
    const handleFileImport = async (file: File) => {
        setIsImporting(true);
        try {
            const newElements = await generateQuestionsFromFile(file);
            handleAddElements(newElements);
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsImporting(false);
        }
    };
    
    const handleUseTemplate = (templateId: string) => {
        const template = FORM_TEMPLATES.find(t => t.id === templateId);
        if (template && currentProject) {
            updateCurrentProject({ elements: [...currentProject.elements, ...template.elements]});
            setIsTemplatesVisible(false);
        }
    };
    
    // --- Media Handlers ---
    const handleStartCapture = (elementId: string, type: QuestionType) => setMediaCaptureInfo({ elementId, type });
    const handleCapture = (dataUrl: string) => {
        if (mediaCaptureInfo) {
            handleUpdateElement(mediaCaptureInfo.elementId, { mediaSrc: dataUrl });
        }
        setMediaCaptureInfo(null);
    };
    
    // --- AI Assistant Handlers ---
    const handleOpenAIAssistantForGeneration = () => {
        setAiCorrectionTargetId(null);
        setIsAIAssistantOpen(true);
    };

    const handleOpenAIAssistantForCorrection = (elementId: string) => {
        setAiCorrectionTargetId(elementId);
        setIsAIAssistantOpen(true);
    };

    const handleCloseAIAssistant = () => {
        setIsAIAssistantOpen(false);
        setAiCorrectionTargetId(null);
    };
    
    const handleAIGenerate = (elements: Partial<FormElement>[]) => {
        if (currentUser) {
            handleAddElements(elements);
        } else {
            setTempGeneratedElements(elements);
            setAuthMode('signup');
            setShowAuthModal(true);
        }
    };

    const handleApplyAICorrection = (updates: Partial<FormElement>) => {
        if (aiCorrectionTargetId) {
            handleUpdateElement(aiCorrectionTargetId, updates);
        }
        handleCloseAIAssistant();
    };

    const aiCorrectionTarget = useMemo(() => {
        if (!aiCorrectionTargetId || !currentProject) return null;
        const found = findElement(currentProject.elements, aiCorrectionTargetId);
        return found ? found.element : null;
    }, [aiCorrectionTargetId, currentProject]);


    // --- Export ---
    const handleExportClick = () => {
        if (!currentProject || !XLSX) return;
    
        const surveySheetHeaders = ['type', 'name', 'label', 'hint', 'required', 'relevant', 'constraint', 'constraint_message', 'repeat_count', 'calculation', 'appearance'];
        const surveySheet: any[][] = [surveySheetHeaders];
        const choicesSheet: any[][] = [['list_name', 'name', 'label']];
        const settingsSheet: any[][] = [['form_title', 'default_language'], [currentProject.title, currentProject.language]];
    
        const processElements = (elements: FormElement[], groupInfo?: { relevant: string }) => {
            elements.forEach(el => {
                const parentRelevant = groupInfo?.relevant;
                const selfRelevant = el.relevant;
                const relevantParts = [parentRelevant, selfRelevant].filter(Boolean);
                const combinedRelevant = relevantParts.length > 0 ? relevantParts.map(p => `(${p})`).join(' and ') : '';
    
                let rowData: { [key: string]: any } = {
                    type: el.type,
                    name: el.name,
                    label: el.label,
                    hint: el.hint || '',
                    required: el.required ? 'yes' : 'no',
                    relevant: combinedRelevant,
                    constraint: el.constraint || '',
                    constraint_message: el.constraint_message || '',
                    repeat_count: el.repeat_count || '',
                    calculation: el.calculation || '',
                    appearance: el.appearance || ''
                };
    
                if (el.type === QuestionType.SELECT_ONE || el.type === QuestionType.SELECT_MULTIPLE) {
                    const listName = el.name;
                    rowData.type = `${el.type} ${listName}`;
                    (el.choices || []).forEach(choice => {
                        choicesSheet.push([listName, choice.name, choice.label]);
                    });
                }
    
                if (el.type === QuestionType.GROUP || el.type === QuestionType.REPEAT) {
                    const beginRow: any = {
                        type: `begin ${el.type}`,
                        name: el.name,
                        label: el.label,
                        relevant: combinedRelevant,
                        hint: el.hint || ''
                    };
                    if (el.type === QuestionType.REPEAT) {
                        beginRow.repeat_count = el.repeat_count || '';
                    }
    
                    surveySheet.push(surveySheetHeaders.map(header => beginRow[header] || ''));
    
                    if (el.children) {
                        processElements(el.children, { relevant: combinedRelevant });
                    }
    
                    const endRow: any = { type: `end ${el.type}` };
                    surveySheet.push(surveySheetHeaders.map(header => endRow[header] || ''));
    
                } else {
                    surveySheet.push(surveySheetHeaders.map(header => rowData[header] || ''));
                }
            });
        };
    
        processElements(currentProject.elements);
    
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(surveySheet), 'survey');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(choicesSheet), 'choices');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(settingsSheet), 'settings');
        XLSX.writeFile(workbook, `${currentProject.title || 'form'}.xlsx`);
        setIsExportConfirmVisible(false);
    };

    // --- Render ---
    const selectedElement = currentProject?.elements.flatMap(function flatten(el: FormElement): FormElement[] { return [el, ...(el.children || []).flatMap(flatten)] }).find(e => e.id === selectedElementId) || null;
    
    if (isAuthenticating) {
        return null; // Or a loading spinner
    }

    return (
        <div className="h-screen w-screen flex flex-col font-sans antialiased">
            {!currentUser ? (
                <LandingPage 
                    onLoginClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                    onSignupClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
                    onAIAssistantClick={handleOpenAIAssistantForGeneration}
                />
            ) : currentProject ? (
                <>
                    <Header
                        onFileImport={handleFileImport}
                        isImporting={isImporting}
                        isOnline={isOnline}
                        onExportClick={() => setIsExportConfirmVisible(true)}
                        formTitle={currentProject.title}
                        onFormTitleChange={handleFormTitleChange}
                        onPreview={() => setIsPreviewVisible(true)}
                        onSettingsClick={() => setIsSettingsVisible(true)}
                        onProjectsClick={() => setIsProjectsVisible(true)}
                        onTemplatesClick={() => setIsTemplatesVisible(true)}
                        onDocsClick={() => setIsDocsVisible(true)}
                        user={currentUser}
                        onLogout={handleLogout}
                        appLanguage={language}
                        setAppLanguage={setLanguage}
                        onSaveProject={handleSaveProject}
                        saveStatus={saveStatus}
                    />
                    <div className="flex flex-1 overflow-hidden">
                        {isSidebarVisible && <Sidebar onAddElement={handleAddElement} />}
                        <main className="flex-1 flex flex-col bg-slate-100">
                             <div className="flex-1 flex overflow-hidden">
                                <FormCanvas
                                    elements={currentProject.elements}
                                    selectedElementId={selectedElementId}
                                    onSelectElement={handleSelectElement}
                                    onDeleteElement={handleDeleteElement}
                                    onDuplicateElement={handleDuplicateElement}
                                    onAddElement={handleAddElement}
                                    onMoveElement={handleMoveElement}
                                    onUpdateElement={handleUpdateElement}
                                    onStartCapture={handleStartCapture}
                                    onStartAICorrection={handleOpenAIAssistantForCorrection}
                                />
                                <PropertiesPanel
                                    element={selectedElement}
                                    elements={currentProject.elements}
                                    selectedIndex={-1} // Note: This prop seems unused, can be removed.
                                    onUpdateElement={handleUpdateElement}
                                    onClearSelection={handleClearSelection}
                                />
                            </div>
                        </main>
                    </div>
                    <button
                        onClick={handleOpenAIAssistantForGeneration}
                        className={`fixed bottom-6 right-6 text-white p-4 rounded-full shadow-lg transition-all flex items-center gap-2 ${isOnline ? 'bg-slate-800 hover:bg-slate-900 hover:scale-110' : 'bg-slate-500 cursor-not-allowed'}`}
                        aria-label={t('ai.open')}
                        disabled={!isOnline}
                    >
                        <Sparkles className="w-6 h-6" />
                    </button>
                </>
            ) : (
                 <div className="flex items-center justify-center h-full text-lg font-semibold">Loading project...</div>
            )}
            
            {/* --- Modals --- */}
            {showAuthModal && <AuthModal initialMode={authMode} onClose={() => setShowAuthModal(false)} onLogin={handleLogin} onSignup={handleSignup} />}
            {isPreviewVisible && currentProject && <PreviewModal formTitle={currentProject.title} elements={currentProject.elements} endOfFormMessage={currentProject.endOfFormMessage || ''} onClose={() => setIsPreviewVisible(false)} />}
            {isSettingsVisible && currentProject && <SettingsModal onClose={() => setIsSettingsVisible(false)} formTitle={currentProject.title} onFormTitleChange={handleFormTitleChange} formLanguage={currentProject.language} onFormLanguageChange={handleFormLanguageChange} endOfFormMessage={currentProject.endOfFormMessage || ''} onEndOfFormMessageChange={handleEndOfFormMessageChange}/>}
            {isProjectsVisible && currentUser && <ProjectsModal projects={projects} onClose={() => setIsProjectsVisible(false)} onOpenProject={handleOpenProject} onNewProject={handleNewProject} onDeleteProject={handleDeleteProject} />}
            {isTemplatesVisible && <TemplatesModal onClose={() => setIsTemplatesVisible(false)} onUseTemplate={handleUseTemplate} />}
            {isDocsVisible && <DocumentationModal onClose={() => setIsDocsVisible(false)} />}
            {mediaCaptureInfo && <MediaCaptureModal type={mediaCaptureInfo.type as any} onClose={() => setMediaCaptureInfo(null)} onCapture={handleCapture} />}
            <ConfirmationModal
                isOpen={isExportConfirmVisible}
                onClose={() => setIsExportConfirmVisible(false)}
                onConfirm={handleExportClick}
                title={t('export.confirm.title')}
                icon={<Download className="w-6 h-6 text-brand-600"/>}
                confirmText={t('export.confirm.button')}
            >
                <p>{t('export.confirm.message')}</p>
            </ConfirmationModal>

            {isAIAssistantOpen && (
                 <AIAssistant
                    isOpen={isAIAssistantOpen}
                    onClose={handleCloseAIAssistant}
                    isOnline={isOnline}
                    onAddElements={handleAIGenerate}
                    correctionTarget={currentUser ? aiCorrectionTarget : null}
                    onApplyCorrection={handleApplyAICorrection}
                />
            )}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <LocalizationProvider>
            <DndProvider backend={HTML5Backend}>
                <AppContent />
            </DndProvider>
        </LocalizationProvider>
    );
}

export default App;

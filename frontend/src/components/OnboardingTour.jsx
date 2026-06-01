import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

/**
 * Lightweight, dependency-free guided tour ("visite guidée").
 *
 * Each step optionally navigates to a route and spotlights a DOM element
 * (matched by a `data-tour` selector). The overlay uses a single highlighted
 * box with a huge box-shadow to dim everything else — no SVG masks needed.
 * Steps without a target render a centered welcome/closing card.
 */

const STEPS = [
    {
        target: null,
        path: '/',
        title: 'Bienvenue dans la démo 👋',
        body: "Ceci est une démonstration interactive de MCP Manager. Toutes les données sont fictives et stockées localement dans votre navigateur — cliquez partout, rien ne peut casser. Laissez-vous guider en 6 étapes (ou passez à tout moment)."
    },
    {
        target: '[data-tour="nav-dashboard"]',
        path: '/',
        title: 'Tableau de bord',
        body: "Vue d'ensemble : nombre de serveurs MCP, serveurs actifs, configurations globales et projets. Le point de départ idéal."
    },
    {
        target: '[data-tour="nav-servers"]',
        path: '/servers',
        title: 'Serveurs MCP',
        body: "Le cœur de l'app. Ajoutez, éditez, activez/désactivez et supprimez vos serveurs. Essayez le bouton « Add Server » ou le commutateur d'un serveur — tout est interactif."
    },
    {
        target: '[data-tour="nav-projects"]',
        path: '/projects',
        title: 'Projets',
        body: "Chaque projet peut avoir sa propre configuration MCP locale. Dépliez un projet pour voir ses serveurs et ses fichiers de configuration."
    },
    {
        target: '[data-tour="nav-marketplace"]',
        path: '/marketplace',
        title: 'Marketplace',
        body: "Installez des intégrations préconfigurées (Filesystem, GitHub, PostgreSQL, Slack…) en un clic. Choisissez la portée puis « Install »."
    },
    {
        target: '[data-tour="nav-settings"]',
        path: '/settings',
        title: 'Réglages',
        body: "Choisissez les providers à gérer (Claude Code, Claude Desktop, OpenCode), définissez le provider par défaut et le comportement d'installation."
    },
    {
        target: '[data-tour="demo-notice"]',
        path: '/settings',
        title: 'Mode démo',
        body: "Ce badge rappelle qu'il s'agit d'un aperçu : les données ne sont pas persistantes côté serveur et certaines fonctionnalités sont simulées."
    },
    {
        target: null,
        path: '/',
        title: 'À vous de jouer ✨',
        body: "C'est terminé ! Explorez librement : ajoutez un serveur, installez une intégration, basculez des providers. Vous pourrez relancer cette visite à tout moment via le bouton « Visite guidée » dans la barre latérale."
    }
];

const MARGIN = 12;

export default function OnboardingTour({ open, onClose }) {
    const [index, setIndex] = useState(0);
    const [rect, setRect] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    const step = STEPS[index];
    const isFirst = index === 0;
    const isLast = index === STEPS.length - 1;

    // Reset to the first step whenever the tour is (re)opened.
    useEffect(() => {
        if (open) setIndex(0);
    }, [open]);

    // Navigate to the step's route if needed.
    useEffect(() => {
        if (!open || !step) return;
        if (step.path && location.pathname !== step.path) {
            navigate(step.path);
        }
    }, [open, index, step, location.pathname, navigate]);

    // Locate (and keep tracking) the highlighted element.
    const updateRect = useCallback(() => {
        if (!open || !step) return;
        if (!step.target) {
            setRect(null);
            return;
        }
        const el = document.querySelector(step.target);
        if (el) {
            const r = el.getBoundingClientRect();
            setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        } else {
            setRect(null);
        }
    }, [open, step]);

    useEffect(() => {
        if (!open) return;
        // Element may mount slightly after a route change — retry a few times.
        updateRect();
        const timers = [60, 180, 360].map((ms) => setTimeout(updateRect, ms));
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, true);
        return () => {
            timers.forEach(clearTimeout);
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
        };
    }, [open, index, location.pathname, updateRect]);

    // Keyboard navigation.
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, STEPS.length - 1));
            else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open || !step) return null;

    const next = () => (isLast ? onClose() : setIndex((i) => i + 1));
    const prev = () => setIndex((i) => Math.max(i - 1, 0));

    // Tooltip positioning: below the target if there's room, otherwise above;
    // centered on screen when there is no target.
    const tooltipStyle = {};
    if (rect) {
        const below = rect.top + rect.height + MARGIN;
        const spaceBelow = window.innerHeight - (rect.top + rect.height);
        if (spaceBelow > 220) {
            tooltipStyle.top = below;
            tooltipStyle.left = Math.max(MARGIN, rect.left);
        } else {
            tooltipStyle.bottom = window.innerHeight - rect.top + MARGIN;
            tooltipStyle.left = Math.max(MARGIN, rect.left);
        }
        tooltipStyle.maxWidth = 340;
    }

    return (
        <div className="tour-root" role="dialog" aria-modal="true" aria-label="Visite guidée">
            {/* Spotlight (or full dim backdrop when there is no target) */}
            {rect ? (
                <div
                    className="tour-spotlight"
                    style={{
                        top: rect.top - 6,
                        left: rect.left - 6,
                        width: rect.width + 12,
                        height: rect.height + 12
                    }}
                />
            ) : (
                <div className="tour-backdrop" />
            )}

            <div className={`tour-card ${rect ? 'tour-card--anchored' : 'tour-card--center'}`} style={tooltipStyle}>
                <button className="tour-close" onClick={onClose} aria-label="Fermer la visite">
                    <X size={16} />
                </button>

                <div className="tour-card-head">
                    <Sparkles size={16} className="tour-card-icon" />
                    <h3 className="tour-card-title">{step.title}</h3>
                </div>
                <p className="tour-card-body">{step.body}</p>

                <div className="tour-card-foot">
                    <span className="tour-progress">{index + 1} / {STEPS.length}</span>
                    <div className="tour-actions">
                        {!isFirst && (
                            <button className="btn btn-ghost btn-sm" onClick={prev}>
                                <ArrowLeft size={14} />
                                Précédent
                            </button>
                        )}
                        {!isLast && (
                            <button className="btn btn-ghost btn-sm" onClick={onClose}>
                                Passer
                            </button>
                        )}
                        <button className="btn btn-primary btn-sm" onClick={next}>
                            {isLast ? 'Terminer' : 'Suivant'}
                            {!isLast && <ArrowRight size={14} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

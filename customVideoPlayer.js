/**
 * CustomVideoPlayer - Une librairie simple pour créer un lecteur vidéo personnalisé
 * 
 * Usage:
 * 1. Inclure les fichiers customVideoPlayer.css et customVideoPlayer.js
 * 2. Créer un élément div avec un id unique
 * 3. Initialiser le lecteur avec:
 *    const player = new CustomVideoPlayer("#monElementId", options);
 */

class CustomVideoPlayer {
    /**
     * Crée un nouveau lecteur vidéo personnalisé
     * @param {string|Element} selector - Sélecteur CSS ou élément DOM où le lecteur sera créé
     * @param {Object} options - Options de configuration (optionnel)
     */
    constructor(selector, options = {}) {
        this.container = typeof selector === 'string' ? 
            document.querySelector(selector) : selector;
            
        if (!this.container) {
            throw new Error("Conteneur pour le lecteur vidéo non trouvé");
        }

        // Options par défaut
        this.options = {
            autoplay: false,
            muted: false,
            loop: false,
            preload: 'auto',
            controlsHideDelay: 2000,
            allowVideoSelection: true, // Nouvelle option pour activer/désactiver la sélection de vidéo
            source: options.source || null,
            poster: options.poster || null,
            ...options
        };

        // Variables d'état
        this.currentQuality = 'auto';
        this.currentSpeed = 1.0;
        this.currentVideoFile = null;
        this.currentVideoURL = null;
        this.thumbnails = {};
        this.controlsTimeout = null;
        this.isMouseOverControls = false;

        // Création de la structure du lecteur
        this.createPlayerElements();
        
        // Initialisation des événements
        this.initEvents();
        
        // Charger la source si elle est fournie
        if (this.options.source) {
            this.video.src = this.options.source;
        }
        
        // Appliquer les options
        if (this.options.poster) {
            this.video.poster = this.options.poster;
        }
        this.video.autoplay = this.options.autoplay;
        this.video.muted = this.options.muted;
        this.video.loop = this.options.loop;
        this.video.preload = this.options.preload;
        
        // Initialiser l'état du volume
        this.updateVolumeUI();
    }

    /**
     * Crée les éléments DOM nécessaires pour le lecteur
     */
    createPlayerElements() {
        // Définir la classe du conteneur
        this.container.classList.add('video-container');
        
        // Créer l'élément vidéo
        this.video = document.createElement('video');
        this.video.id = `video-${Math.floor(Math.random() * 1000000)}`;
        
        // Créer les indicateurs d'action
        this.playPauseIndicator = this.createActionIndicator('playPauseIndicator', '⏸️', 'Pause');
        this.volumeIndicator = this.createVolumeActionIndicator();
        this.seekIndicator = this.createActionIndicator('seekIndicator', '⏩', '+5s');
        
        // Créer le conteneur de prévisualisation
        this.previewContainer = document.createElement('div');
        this.previewContainer.className = 'preview-container';
        this.previewContainer.id = 'previewContainer';
        
        this.previewThumbnail = document.createElement('div');
        this.previewThumbnail.className = 'preview-thumbnail';
        this.previewThumbnail.id = 'previewThumbnail';
        
        this.previewTime = document.createElement('div');
        this.previewTime.className = 'preview-time';
        this.previewTime.id = 'previewTime';
        this.previewTime.textContent = '0:00';
        
        this.previewContainer.appendChild(this.previewThumbnail);
        this.previewContainer.appendChild(this.previewTime);
        
        // Canvas caché pour l'extraction de frames
        this.thumbnailCanvas = document.createElement('canvas');
        this.thumbnailCanvas.id = 'thumbnailCanvas';
        this.thumbnailCanvas.width = 160;
        this.thumbnailCanvas.height = 90;
        this.thumbnailContext = this.thumbnailCanvas.getContext('2d');
        
        // Créer les contrôles
        this.controls = document.createElement('div');
        this.controls.className = 'controls';
        
        // Barre de progression
        this.progressContainer = document.createElement('div');
        this.progressContainer.className = 'progress-container';
        this.progressContainer.id = 'progressContainer';
        
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'progress-bar';
        this.progressBar.id = 'progressBar';
        
        this.progressContainer.appendChild(this.progressBar);
        
        // Conteneur des boutons
        this.buttonsContainer = document.createElement('div');
        this.buttonsContainer.className = 'buttons-container';
        
        // Contrôles gauche
        this.leftControls = document.createElement('div');
        this.leftControls.className = 'left-controls';
        
        this.playPauseBtn = this.createButton('playPause', '▶️', 'Lecture/Pause');
        
        if (this.options.allowVideoSelection) {
            this.loadVideoBtn = this.createButton('loadVideo', '📁', 'Charger une vidéo');
            
            this.videoInput = document.createElement('input');
            this.videoInput.type = 'file';
            this.videoInput.id = 'videoInput';
            this.videoInput.className = 'file-input';
            this.videoInput.accept = 'video/*';
            
            this.leftControls.appendChild(this.loadVideoBtn);
            this.leftControls.appendChild(this.videoInput);
        }
        
        this.timeDisplay = document.createElement('div');
        this.timeDisplay.className = 'time-display';
        this.timeDisplay.id = 'timeDisplay';
        this.timeDisplay.textContent = '0:00 / 0:00';
        
        this.speedBtn = this.createButton('speedBtn', '1x', 'Vitesse de lecture', 'speed-btn');
        
        this.leftControls.appendChild(this.playPauseBtn);
        this.leftControls.appendChild(this.timeDisplay);
        this.leftControls.appendChild(this.speedBtn);
        
        // Contrôles droite
        this.rightControls = document.createElement('div');
        this.rightControls.className = 'right-controls';
        
        // Contrôle de volume
        this.volumeControl = document.createElement('div');
        this.volumeControl.className = 'volume-control';
        
        this.muteBtn = this.createButton('muteBtn', '🔊', 'Muet');
        
        this.volumeSlider = document.createElement('input');
        this.volumeSlider.type = 'range';
        this.volumeSlider.id = 'volumeSlider';
        this.volumeSlider.className = 'volume-slider';
        this.volumeSlider.min = '0';
        this.volumeSlider.max = '1';
        this.volumeSlider.step = '0.1';
        this.volumeSlider.value = '1';
        
        this.volumeControl.appendChild(this.muteBtn);
        this.volumeControl.appendChild(this.volumeSlider);
        
        this.pipBtn = this.createButton('pipBtn', '📺', 'Picture-in-Picture', 'pip-btn');
        this.settingsBtn = this.createButton('settingsBtn', '⚙️', 'Paramètres', 'settings-btn');
        this.fullscreenBtn = this.createButton('fullscreenBtn', '⛶', 'Plein écran', 'fullscreen-btn');
        
        this.rightControls.appendChild(this.volumeControl);
        this.rightControls.appendChild(this.pipBtn);
        this.rightControls.appendChild(this.settingsBtn);
        this.rightControls.appendChild(this.fullscreenBtn);
        
        // Assembler le conteneur de boutons
        this.buttonsContainer.appendChild(this.leftControls);
        this.buttonsContainer.appendChild(this.rightControls);
        
        // Assembler les contrôles
        this.controls.appendChild(this.progressContainer);
        this.controls.appendChild(this.buttonsContainer);
        
        // Créer les menus
        this.qualityMenu = this.createMenu('quality-menu', [
            { value: 'auto', text: 'Auto' },
            { value: '1080p', text: '1080p' },
            { value: '720p', text: '720p' },
            { value: '480p', text: '480p' },
            { value: '360p', text: '360p' }
        ], 'quality-option', 'data-quality');
        
        this.speedMenu = this.createMenu('speed-menu', [
            { value: '0.25', text: '0.25x' },
            { value: '0.5', text: '0.5x' },
            { value: '0.75', text: '0.75x' },
            { value: '1.0', text: 'Normal (1x)' },
            { value: '1.25', text: '1.25x' },
            { value: '1.5', text: '1.5x' },
            { value: '2.0', text: '2x' }
        ], 'speed-option', 'data-speed');
        
        // Assembler tout dans le conteneur
        this.container.appendChild(this.video);
        this.container.appendChild(this.playPauseIndicator);
        this.container.appendChild(this.volumeIndicator);
        this.container.appendChild(this.seekIndicator);
        this.container.appendChild(this.previewContainer);
        this.container.appendChild(this.thumbnailCanvas);
        this.container.appendChild(this.controls);
        this.container.appendChild(this.qualityMenu);
        this.container.appendChild(this.speedMenu);
    }

    /**
     * Crée un bouton avec l'ID, le texte et le titre spécifiés
     */
    createButton(id, text, title, className = '') {
        const button = document.createElement('button');
        button.id = id;
        button.textContent = text;
        button.title = title;
        if (className) {
            button.className = className;
        }
        return button;
    }

    /**
     * Crée un indicateur d'action
     */
    createActionIndicator(id, iconText, text) {
        const indicator = document.createElement('div');
        indicator.className = 'action-indicator';
        indicator.id = id;
        
        const icon = document.createElement('span');
        icon.className = 'icon';
        icon.textContent = iconText;
        
        const textSpan = document.createElement('span');
        textSpan.className = 'text';
        textSpan.textContent = text;
        
        indicator.appendChild(icon);
        indicator.appendChild(textSpan);
        
        return indicator;
    }

    /**
     * Crée un indicateur d'action pour le volume avec une barre de volume
     */
    createVolumeActionIndicator() {
        const indicator = this.createActionIndicator('volumeIndicator', '🔊', 'Volume');
        
        const volumeLevel = document.createElement('div');
        volumeLevel.className = 'volume-level';
        
        const volumeFill = document.createElement('div');
        volumeFill.className = 'volume-fill';
        volumeFill.id = 'volumeFill';
        
        volumeLevel.appendChild(volumeFill);
        indicator.appendChild(volumeLevel);
        
        return indicator;
    }

    /**
     * Crée un menu avec les options spécifiées
     */
    createMenu(menuClass, options, optionClass, dataAttribute) {
        const menu = document.createElement('div');
        menu.className = menuClass;
        
        options.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = optionClass;
            optionElement.setAttribute(dataAttribute, option.value);
            optionElement.textContent = option.text;
            menu.appendChild(optionElement);
        });
        
        return menu;
    }

    /**
     * Initialise tous les événements du lecteur
     */
    initEvents() {
        // Événements de contrôle de base
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.video.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlayPause();
        });
        
        // Chargement de vidéo
        if (this.options.allowVideoSelection) {
            this.loadVideoBtn.addEventListener('click', () => this.videoInput.click());
            this.videoInput.addEventListener('change', (e) => this.handleVideoUpload(e));
        }
        
        // Barre de progression
        this.video.addEventListener('timeupdate', () => this.updateProgressBar());
        this.progressContainer.addEventListener('click', (e) => this.seekToPosition(e));
        this.video.addEventListener('loadedmetadata', () => this.onVideoLoaded());
        
        // Prévisualisation au survol
        this.progressContainer.addEventListener('mousemove', (e) => this.showPreview(e));
        this.progressContainer.addEventListener('mouseleave', () => this.hidePreview());
        this.progressContainer.addEventListener('click', () => {
            setTimeout(() => this.hidePreview(), 200);
        });
        
        // Contrôle du volume
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', () => this.changeVolume());
        
        // Plein écran
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        document.addEventListener('fullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('mozfullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('MSFullscreenChange', () => this.updateFullscreenButton());
        
        // Picture-in-Picture
        this.pipBtn.addEventListener('click', () => this.togglePictureInPicture());
        this.video.addEventListener('enterpictureinpicture', () => this.onEnterPiP());
        this.video.addEventListener('leavepictureinpicture', () => this.onLeavePiP());
        
        // Contrôles de qualité
        this.settingsBtn.addEventListener('click', (e) => this.toggleQualityMenu(e));
        this.qualityMenu.querySelectorAll('.quality-option').forEach(option => {
            option.addEventListener('click', () => {
                const quality = option.getAttribute('data-quality');
                this.changeQuality(quality);
                this.updateActiveMenuOption(this.qualityMenu, 'quality-option', quality, 'data-quality');
                this.qualityMenu.style.display = 'none';
            });
        });
        
        // Contrôles de vitesse
        this.speedBtn.addEventListener('click', (e) => this.toggleSpeedMenu(e));
        this.speedMenu.querySelectorAll('.speed-option').forEach(option => {
            option.addEventListener('click', () => {
                const speed = parseFloat(option.getAttribute('data-speed'));
                this.changePlaybackSpeed(speed);
                this.updateActiveMenuOption(this.speedMenu, 'speed-option', speed.toString(), 'data-speed');
                this.speedMenu.style.display = 'none';
            });
        });
        
        // Masquer les menus en cliquant ailleurs
        document.addEventListener('click', (e) => {
            if (!this.qualityMenu.contains(e.target) && e.target !== this.settingsBtn) {
                this.qualityMenu.style.display = 'none';
            }
            if (!this.speedMenu.contains(e.target) && e.target !== this.speedBtn) {
                this.speedMenu.style.display = 'none';
            }
        });
        
        // Auto-hide des contrôles
        this.container.addEventListener('mousemove', () => this.showControls());
        this.controls.addEventListener('mouseenter', () => {
            this.isMouseOverControls = true;
            clearTimeout(this.controlsTimeout);
        });
        this.controls.addEventListener('mouseleave', () => {
            this.isMouseOverControls = false;
            if (!this.video.paused) {
                this.controlsTimeout = setTimeout(() => this.hideControls(), this.options.controlsHideDelay);
            }
        });
        this.video.addEventListener('pause', () => this.showControls());
        this.video.addEventListener('play', () => {
            if (!this.isMouseOverControls) {
                this.controlsTimeout = setTimeout(() => this.hideControls(), this.options.controlsHideDelay);
            }
        });
        this.container.addEventListener('mouseleave', () => {
            if (!this.video.paused) {
                this.controlsTimeout = setTimeout(() => this.hideControls(), this.options.controlsHideDelay);
            }
        });
        
        // Focus et raccourcis clavier
        this.container.tabIndex = "-1";
        this.video.addEventListener('click', () => this.container.focus());
        
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        this.controls.addEventListener('keydown', (e) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.stopPropagation();
            }
        });
        
        // Init
        window.addEventListener('load', () => {
            // Initialiser le menu de vitesse
            this.updateActiveMenuOption(this.speedMenu, 'speed-option', '1.0', 'data-speed');
            
            // Check PiP support
            if (!this.isPictureInPictureSupported()) {
                this.pipBtn.disabled = true;
                this.pipBtn.title = 'Picture-in-Picture non supporté';
                this.pipBtn.style.opacity = '0.5';
            }
        });
    }

    // ...existing code...
}

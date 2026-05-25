document.addEventListener('DOMContentLoaded', () => {
    
    const grid = document.getElementById('game-grid');
    const hddDropdown = document.getElementById('hdd-dropdown');
    const hddSelectedText = document.getElementById('selected-capacity-text');
    const hddItems = document.querySelectorAll('.dropdown-item');
    const storageUsedEl = document.getElementById('storage-used');
    const storageTotalEl = document.getElementById('storage-total');
    const storageRemainingEl = document.getElementById('storage-remaining');
    const progressBar = document.getElementById('progressBar');
    const progressEl = document.getElementById('progress-bar');
    const selectedCountEl = document.getElementById('selected-count');
    const modalOverlay = document.getElementById('info-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalReqs = document.getElementById('modal-reqs');
    const modalInfo = document.getElementById('modal-info');
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const exportBtn = document.getElementById('export-btn');
    const exportModal = document.getElementById('export-modal');
    const closeExportModalBtn = document.getElementById('close-export-modal');
    const exportTableBody = document.getElementById('export-table-body');
    const exportTotalSize = document.getElementById('export-total-size');
    const copyTextBtn = document.getElementById('copy-text-btn');
    const storageTypeLabelEl = document.getElementById('storage-type-label');
    const storageTypeSelect = document.getElementById('storage-type-select');
    const landingScreen = document.getElementById('landing-screen');
    const landingActions = document.getElementById('landing-storage-actions');
    const MODAL_TRANSITION_MS = 300;

    
    const controlsEl = document.querySelector('.controls');
    let exportFloating = false;
    let exportBtnWrap = null;

    function computeExportWrapSize() {
        if (!exportBtn || !exportBtnWrap) return;
        const rect = exportBtn.getBoundingClientRect();
        document.documentElement.style.setProperty('--export-btn-w', `${Math.ceil(rect.width)}px`);
        document.documentElement.style.setProperty('--export-btn-h', `${Math.ceil(rect.height)}px`);
    }

    function flipAnimateExportButton(toggleBodyClass) {
        if (!exportBtn) return;
        const first = exportBtn.getBoundingClientRect();
        toggleBodyClass();
        
        
        exportBtn.offsetWidth;
        const last = exportBtn.getBoundingClientRect();

        const dx = first.left - last.left;
        const dy = first.top - last.top;

        exportBtn.style.transform = `translate(${dx}px, ${dy}px)`;
        exportBtn.getBoundingClientRect();
        requestAnimationFrame(() => {
            exportBtn.style.transform = 'translate(0, 0)';
        });
    }

    function setExportFloating(shouldFloat) {
        if (!exportBtn) return;
        if (shouldFloat === exportFloating) return;

        exportFloating = shouldFloat;
        exportBtnWrap = exportBtnWrap || exportBtn.closest('.export-btn-wrap');
        computeExportWrapSize();

        flipAnimateExportButton(() => {
            document.body.classList.toggle('export-float', shouldFloat);
        });
    }

    function shouldFloatExportButton() {
        if (!controlsEl) return false;
        const rect = controlsEl.getBoundingClientRect();
        
        return rect.bottom < 0;
    }

    function onScrollOrResize() {
        setExportFloating(shouldFloatExportButton());
    }

    if (exportBtn) {
        exportBtnWrap = exportBtn.closest('.export-btn-wrap');
        
        computeExportWrapSize();
        onScrollOrResize();

        window.addEventListener('scroll', onScrollOrResize, { passive: true });
        window.addEventListener('resize', () => {
            computeExportWrapSize();
            onScrollOrResize();
        });
    }

    
    const selectedWidget = document.getElementById('selected-widget');
    const selectedWidgetBtn = document.getElementById('selected-widget-btn');
    const selectedWidgetPanel = document.getElementById('selected-widget-panel');
    const selectedWidgetClose = document.getElementById('selected-widget-close');
    const selectedWidgetList = document.getElementById('selected-widget-list');
    const selectedWidgetCount = document.getElementById('selected-widget-count');
    
    
    let gamesData = [];
    let displayedGamesData = [];
    let selectedGames = new Set();
    let gamesByTitle = new Map();

    const sizeConfigPath = 'size_config.json';

    function normalizeBufferPercentage(value) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return 5;
        return Math.min(100, Math.max(0, parsed));
    }

    function setSizeBufferPercentage(value) {
        sizeBufferPercentage = normalizeBufferPercentage(value);
        sizeBufferMultiplier = 1 + (sizeBufferPercentage / 100);
        localStorage.setItem('game_size_buffer_percentage', String(sizeBufferPercentage));
    }

    
    let sizeBufferPercentage = 5;
    let sizeBufferMultiplier = 1.05;

    async function loadSizeBufferConfig() {
        try {
            const cacheBuster = new Date().getTime();
            const response = await fetch(`${sizeConfigPath}?t=${cacheBuster}`, { cache: 'no-store' });
            if (response.ok) {
                const cfg = await response.json();
                setSizeBufferPercentage(cfg && cfg.size_buffer_percentage);
                return;
            }
        } catch (err) {
            console.warn('Failed to load size config, using fallback.', err);
        }

        setSizeBufferPercentage(localStorage.getItem('game_size_buffer_percentage'));
    }

    
    window.addEventListener('storage', (e) => {
        if (e.key === 'game_size_buffer_percentage') {
            setSizeBufferPercentage(e.newValue);
            
            
            gamesData.forEach((game) => {
                if (Number.isFinite(game._sizeGB)) {
                    game._estimatedSizeGB = game._sizeGB * sizeBufferMultiplier;
                }
            });
            
            updateStorageUI();
            renderGrid(true);
        }
    });

    
    let currentCategory = (categoryFilter && categoryFilter.value) ? categoryFilter.value : 'all';

    let currentStorageType = 'hdd';
    const storagePresets = {
        hdd: {
            label: 'HDD',
            category: 'all',
            defaultCapacity: 455,
            capacities: [
                { text: '320 GB', value: 288 },
                { text: '500 GB', value: 455 },
                { text: '1 TB', value: 920 }
            ]
        },
        flashdisk: {
            label: 'FLASHDISK',
            category: 'ps2',
            defaultCapacity: 58,
            capacities: [
                { text: '32 GB', value: 29 },
                { text: '64 GB', value: 58 },
                { text: '128 GB', value: 116 }
            ]
        },
        ssd: {
            label: 'SSD',
            category: 'all',
            defaultCapacity: 476,
            capacities: [
                { text: '256 GB', value: 238 },
                { text: '512 GB', value: 476 },
                { text: '1 TB', value: 953 }
            ]
        }
    };
    
    
    let currentHddCapacity = parseInt(document.querySelector('.dropdown-item.active').getAttribute('data-value')); 
    let totalUsedGB = 0;
    
    
    function getItemsPerPage() {
        
        if (window.matchMedia && window.matchMedia('(max-width: 480px)').matches) return 18;
        if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) return 24;
        return 50;
    }

    let itemsPerPage = getItemsPerPage();
    let currentPage = 1;

    
    let widgetOpen = false;

    
    const loadMoreBtn = document.getElementById('load-more-btn');

    

    let pcLoaded = false;
    let ps2Loaded = false;
    let pcLoadingPromise = null;
    let ps2LoadingPromise = null;

    function rebuildLookup() {
        
        gamesData.forEach((game, idx) => {
            game._index = idx;

            if (!game.banner_url) {
                game.banner_url = 'assets/logo.png';
            }

            const rawSize = (game.game_info && game.game_info['Game Size'] != null)
                ? game.game_info['Game Size']
                : 0;
            game._sizeGB = parseSizeToGB(rawSize);

            
            game._estimatedSizeGB = (Number.isFinite(game._sizeGB) ? game._sizeGB * sizeBufferMultiplier : 0);
        });

        
        gamesByTitle.clear();
        gamesData.forEach(game => {
            if (game && game.title) {
                gamesByTitle.set(game.title, game);
            }
        });
    }

    async function ensureGamesLoaded(needed) {
        const cacheBuster = new Date().getTime();
        const promises = [];

        if (needed.includes('pc') && !pcLoaded) {
            if (!pcLoadingPromise) {
                pcLoadingPromise = fetch(`steamrip_games_updated.json?t=${cacheBuster}`, { cache: 'no-store' })
                    .then(res => {
                        if (!res.ok) throw new Error('Gagal memuat game PC');
                        return res.json();
                    })
                    .then(data => {
                        pcLoaded = true;
                        pcLoadingPromise = null;
                        return data.map(g => ({ ...g, _category: 'pc' }));
                    })
                    .catch(err => {
                        pcLoadingPromise = null;
                        console.error(err);
                        showToast('Gagal memuat data game PC.', 'error');
                        return [];
                    });
            }
            promises.push(pcLoadingPromise.then(games => {
                const alreadyAdded = gamesData.some(g => g && g._category === 'pc');
                if (!alreadyAdded) {
                    gamesData.push(...games);
                    rebuildLookup();
                }
            }));
        }

        if (needed.includes('ps2') && !ps2Loaded) {
            if (!ps2LoadingPromise) {
                ps2LoadingPromise = fetch(`ps2.json?t=${cacheBuster}`, { cache: 'no-store' })
                    .then(res => {
                        if (!res.ok) throw new Error('Gagal memuat game PS2');
                        return res.json();
                    })
                    .then(data => {
                        ps2Loaded = true;
                        ps2LoadingPromise = null;
                        
                        function getPopularityRank(game) {
                            const val = game && game.game_info ? game.game_info['Popularity Rank'] : null;
                            const n = Number(val);
                            return Number.isFinite(n) ? n : 0;
                        }
                        const hasPopularityRank = data.some(g => getPopularityRank(g) > 0);
                        if (hasPopularityRank) {
                            data.sort((a, b) => {
                                const ra = getPopularityRank(a);
                                const rb = getPopularityRank(b);
                                if (ra !== rb) {
                                    if (ra === 0) return 1;
                                    if (rb === 0) return -1;
                                    return ra - rb;
                                }
                                return String(a && a.title ? a.title : '').localeCompare(String(b && b.title ? b.title : ''), 'id');
                            });
                        }
                        return data.map(g => ({ ...g, _category: 'ps2' }));
                    })
                    .catch(err => {
                        ps2LoadingPromise = null;
                        console.error(err);
                        showToast('Gagal memuat data game PS2.', 'error');
                        return [];
                    });
            }
            promises.push(ps2LoadingPromise.then(games => {
                const alreadyAdded = gamesData.some(g => g && g._category === 'ps2');
                if (!alreadyAdded) {
                    gamesData.push(...games);
                    rebuildLookup();
                }
            }));
        }

        if (promises.length > 0) {
            grid.innerHTML = `<div class="loading-state">Memuat data game...</div>`;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            await Promise.all(promises);
        }
    }

    async function applyFilters() {
        const category = currentCategory || 'all';

        
        const needed = [];
        if (category === 'all' || category === 'pc') needed.push('pc');
        if (category === 'all' || category === 'ps2') needed.push('ps2');

        await ensureGamesLoaded(needed);

        const query = (searchInput && searchInput.value ? searchInput.value : '').toLowerCase();

        displayedGamesData = gamesData.filter((game) => {
            if (!game) return false;
            const matchesQuery = !query || (game.title || '').toLowerCase().includes(query);
            const matchesCategory = (category === 'all') || (game._category === category);
            return matchesQuery && matchesCategory;
        });

        
        if (category === 'all') {
            displayedGamesData.sort((a, b) => {
                if (a._category === b._category) {
                    return a._index - b._index;
                }
                if (a._category === 'pc') return -1;
                if (b._category === 'pc') return 1;
                return 0;
            });
        }

        renderGrid(true);
    }

    
    function parseSizeToGB(sizeStr) {
        if (!sizeStr) return 0;
        const s = String(sizeStr).replace(',', '.').toUpperCase();
        const match = s.match(/\d+(?:\.\d+)?/);
        const num = match ? parseFloat(match[0]) : NaN;
        if (isNaN(num)) return 0;
        
        if (s.includes('MB')) return num / 1024;
        if (s.includes('KB')) return num / (1024 * 1024);
        return num; 
    }

    function formatSizeGB(sizeGB) {
        const safe = Number.isFinite(sizeGB) ? sizeGB : 0;
        const rounded = Math.round((safe + Number.EPSILON) * 10) / 10;
        return `${rounded.toFixed(1)} GB`;
    }

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    function getSelectedGames() {
        return Array.from(selectedGames)
            .map((title) => gamesByTitle.get(title))
            .filter(Boolean);
    }

    function setOverlayState(overlayEl, isOpen) {
        if (!overlayEl) return;

        if (isOpen) {
            overlayEl.style.visibility = 'visible';
            overlayEl.classList.add('active');
            document.body.style.overflow = 'hidden';
            return;
        }

        overlayEl.classList.remove('active');
        setTimeout(() => {
            if (!overlayEl.classList.contains('active')) {
                overlayEl.style.visibility = 'hidden';
            }
        }, MODAL_TRANSITION_MS);
        document.body.style.overflow = '';
    }

    function appendDetailRows(listEl, rows, emptyText) {
        if (!listEl) return;

        listEl.innerHTML = '';

        if (!rows.length) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'text-secondary';
            emptyItem.textContent = emptyText;
            listEl.appendChild(emptyItem);
            return;
        }

        const fragment = document.createDocumentFragment();
        rows.forEach(([label, value]) => {
            const li = document.createElement('li');
            const strong = document.createElement('span');
            strong.className = 'list-label';
            strong.textContent = label;

            li.appendChild(strong);
            li.appendChild(document.createTextNode(`: ${value}`));
            fragment.appendChild(li);
        });

        listEl.appendChild(fragment);
    }

    function stripVersionSuffix(title) {
        if (!title) return '';

        let text = String(title).trim();
        const versionSuffixRe = /\s*\((?:\s*(?:v\s*\d|build\b|Build\b|B_\d|b_\d)[^)]*)\)\s*$/;

        while (versionSuffixRe.test(text)) {
            text = text.replace(versionSuffixRe, '').trim();
        }

        return text;
    }

    function needsPs2Suffix(game) {
        if (!game) return false;
        if (game._category === 'ps2') return true;

        const platform = game.game_info ? String(game.game_info.Platform || '') : '';
        return platform.toUpperCase().includes('PS2');
    }

    function formatExportTitle(game) {
        const title = stripVersionSuffix((game && game.title) ? game.title : 'Untitled');

        if (!needsPs2Suffix(game)) {
            return title;
        }

        if (/\(PS2\)\s*$/i.test(title)) {
            return title;
        }

        return `${title} (PS2)`;
    }

    
    function calculateEstimatedSize(sizeStr) {
        const sizeGB = parseSizeToGB(sizeStr) * sizeBufferMultiplier;
        return formatSizeGB(sizeGB);
    }

    
    window.calculateEstimatedSize = calculateEstimatedSize;

    
    function updateStorageUI() {
        storageTotalEl.innerText = `${currentHddCapacity} GB`;
        
        totalUsedGB = 0;
        selectedGames.forEach(title => {
            const g = gamesByTitle.get(title);
            totalUsedGB += g ? (Number.isFinite(g._estimatedSizeGB) ? g._estimatedSizeGB : 0) : 0;
        });

        const remaining = currentHddCapacity - totalUsedGB;
        
        
        storageUsedEl.innerText = `${totalUsedGB.toFixed(1)} GB`;
        storageRemainingEl.innerText = `${remaining.toFixed(1)} GB`;
        selectedCountEl.innerText = selectedGames.size;

        
        if (selectedWidgetCount) {
            selectedWidgetCount.innerText = selectedGames.size;
        }
        renderSelectedWidget();

        
        let percentage = (totalUsedGB / currentHddCapacity) * 100;
        if (percentage > 100) percentage = 100;
        progressEl.style.width = `${percentage}%`;

        
        if (remaining < 0) {
            storageRemainingEl.style.color = 'var(--danger)';
            progressEl.style.background = 'var(--danger)';
        } else if (percentage > 85) {
            storageRemainingEl.style.color = '#ffa502'; 
            progressEl.style.background = 'linear-gradient(135deg, #ffa502, #ff4757)';
        } else {
            storageRemainingEl.style.color = 'var(--text-primary)';
            progressEl.style.background = 'var(--accent-gradient)';
        }
    }

    function setWidgetOpen(open) {
        widgetOpen = open;
        if (!selectedWidgetPanel) return;
        selectedWidgetPanel.classList.toggle('open', open);
    }

    function toggleWidget() {
        setWidgetOpen(!widgetOpen);
    }

    function renderSelectedWidget() {
        if (!selectedWidgetList) return;

        selectedWidgetList.innerHTML = '';
        const selectedTitles = Array.from(selectedGames);

        if (selectedTitles.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'assistive-empty';
            emptyEl.textContent = 'Belum ada game yang dipilih.';
            selectedWidgetList.appendChild(emptyEl);
            return;
        }

        selectedTitles.forEach((title) => {
            const game = gamesByTitle.get(title);
            if (!game) return;

            const item = document.createElement('div');
            item.className = 'assistive-item';

            const left = document.createElement('div');
            left.style.display = 'flex';
            left.style.flexDirection = 'column';
            left.style.gap = '2px';

            const titleEl = document.createElement('div');
            titleEl.className = 'assistive-item-title';
            titleEl.textContent = game.title || 'Untitled';

            const metaEl = document.createElement('div');
            metaEl.className = 'assistive-item-meta';
            metaEl.textContent = formatSizeGB(Number.isFinite(game._estimatedSizeGB) ? game._estimatedSizeGB : 0);

            left.appendChild(titleEl);
            left.appendChild(metaEl);

            const checkBadge = document.createElement('button');
            checkBadge.type = 'button';
            checkBadge.className = 'assistive-check';
            checkBadge.dataset.title = game.title;
            checkBadge.setAttribute('aria-label', `Hapus ${game.title || 'game ini'} dari pilihan`);
            checkBadge.textContent = '🗑';

            item.appendChild(left);
            item.appendChild(checkBadge);
            selectedWidgetList.appendChild(item);
        });
    }

    
    function setDropdownOptionsByStorageType(type) {
        const preset = storagePresets[type];
        if (!preset) return;

        hddItems.forEach((item, index) => {
            const option = preset.capacities[index] || preset.capacities[preset.capacities.length - 1];
            item.textContent = option.text;
            item.setAttribute('data-label', option.text);
            item.setAttribute('data-value', String(option.value));
            item.classList.remove('active');
        });

        
        if (hddSelectedText && preset.capacities[0]) {
            hddSelectedText.innerText = preset.capacities[0].text;
        }
    }

    function setCapacityByValue(capacityValue) {
        const numericValue = Number(capacityValue);
        if (!Number.isFinite(numericValue)) return;

        const matchedItem = Array.from(hddItems).find((item) => Number(item.getAttribute('data-value')) === numericValue);
        if (!matchedItem) {
            if (hddSelectedText) {
                hddSelectedText.innerText = `${Math.round(numericValue)} GB`;
            }
            currentHddCapacity = numericValue;
            return;
        }

        hddItems.forEach((i) => i.classList.remove('active'));
        matchedItem.classList.add('active');
        hddSelectedText.innerText = matchedItem.getAttribute('data-label') || matchedItem.textContent || `${Math.round(numericValue)} GB`;
        currentHddCapacity = numericValue;
    }

    function applyStoragePreset(type) {
        const preset = storagePresets[type];
        if (!preset) return;

        currentStorageType = type;
        setDropdownOptionsByStorageType(type);
        setCapacityByValue(preset.defaultCapacity);

        if (categoryFilter) {
            if (type === 'flashdisk') {
                categoryFilter.innerHTML = `<option value="ps2" selected>PS2 Emu</option>`;
            } else {
                categoryFilter.innerHTML = `
                    <option value="all" ${preset.category === 'all' ? 'selected' : ''}>Semua Kategori</option>
                    <option value="pc" ${preset.category === 'pc' ? 'selected' : ''}>Game PC</option>
                    <option value="ps2" ${preset.category === 'ps2' ? 'selected' : ''}>PS2 Emu</option>
                `;
            }
        }
        currentCategory = (categoryFilter && categoryFilter.value) ? categoryFilter.value : preset.category;

        if (storageTypeLabelEl) {
            storageTypeLabelEl.innerText = preset.label;
        }

        if (storageTypeSelect) {
            storageTypeSelect.value = type;
        }

        applyFilters();
        updateStorageUI();
    }

    function closeLandingScreen() {
        if (!landingScreen) return;
        document.body.classList.remove('landing-active');
        landingScreen.style.display = 'none';
    }

    if (landingActions) {
        landingActions.addEventListener('click', (e) => {
            const btn = e.target.closest('.landing-choice-card');
            if (!btn) return;
            const storageType = btn.getAttribute('data-storage');
            applyStoragePreset(storageType);
            closeLandingScreen();
        });
    } else if (storageTypeLabelEl) {
        applyStoragePreset(currentStorageType);
    }

    if (storageTypeSelect) {
        storageTypeSelect.addEventListener('change', (e) => {
            applyStoragePreset(e.target.value);
            if (landingScreen && document.body.classList.contains('landing-active')) {
                closeLandingScreen();
            }
        });
    }

    hddDropdown.addEventListener('click', (e) => {
        
        hddDropdown.classList.toggle('open');
    });

    
    document.addEventListener('click', (e) => {
        if (!hddDropdown.contains(e.target)) {
            hddDropdown.classList.remove('open');
        }
    });

    
    if (selectedWidgetBtn && selectedWidgetPanel) {
        selectedWidgetBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleWidget();
        });
    }

    if (selectedWidgetClose) {
        selectedWidgetClose.addEventListener('click', (e) => {
            e.stopPropagation();
            setWidgetOpen(false);
        });
    }

    
    document.addEventListener('click', (e) => {
        if (!widgetOpen) return;
        if (selectedWidget && !selectedWidget.contains(e.target)) {
            setWidgetOpen(false);
        }
    });

    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && widgetOpen) {
            setWidgetOpen(false);
        }
    });

    if (selectedWidgetList) {
        selectedWidgetList.addEventListener('click', (e) => {
            const checkBtn = e.target.closest('.assistive-check');
            if (!checkBtn) return;

            e.stopPropagation();

            const title = checkBtn.dataset.title;
            if (!title) return;

            selectedGames.delete(title);

            const card = grid.querySelector(`.game-card[data-title="${CSS.escape(title)}"]`);
            if (card) {
                card.classList.remove('selected');
            }

            updateStorageUI();
        });
    }

    hddItems.forEach(item => {
        item.addEventListener('click', (e) => {
            
            hddItems.forEach(i => i.classList.remove('active'));
            
            item.classList.add('active');
            
            
            hddSelectedText.innerText = item.getAttribute('data-label') || item.textContent || hddSelectedText.innerText;
            
            
            currentHddCapacity = parseInt(item.getAttribute('data-value'));
            updateStorageUI();
        });
    });

    

    function renderGrid(reset = false) {
        if (reset) {
            grid.innerHTML = '';
            currentPage = 1;
            itemsPerPage = getItemsPerPage();
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentDataChunk = displayedGamesData.slice(startIndex, endIndex);

        if (currentDataChunk.length === 0 && reset) {
            grid.innerHTML = `<div class="loading-state">Tidak ada game yang ditemukan.</div>`;
            loadMoreBtn.style.display = 'none';
            return;
        }

        const fragment = document.createDocumentFragment();

        currentDataChunk.forEach((game) => {
            
            const originalIndex = Number.isInteger(game._index) ? game._index : gamesData.indexOf(game);
            
            
            const card = document.createElement('div');
            card.className = 'game-card';
            card.setAttribute('data-index', originalIndex);
            card.setAttribute('data-title', game.title);
            
            
            const sizeStr = game.game_info ? game.game_info['Game Size'] : 'N/A';
            const estimatedSizeLabel = formatSizeGB(Number.isFinite(game._estimatedSizeGB) ? game._estimatedSizeGB : parseSizeToGB(sizeStr));
            
            card.innerHTML = `
                <img src="${game.banner_url}" alt="${game.title}" class="card-img" loading="lazy" decoding="async">
                
                <div class="selected-overlay">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                
                <div class="size-badge">${estimatedSizeLabel}</div>
                
                <div class="title-overlay">
                    <div class="game-title">${game.title}</div>
                </div>
                
                <div class="info-btn" data-index="${originalIndex}" title="Informasi Game">i</div>
            `;

            
            const infoBtn = card.querySelector('.info-btn');
            if (infoBtn) {
                infoBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openInfoModal(gamesData[originalIndex]);
                });
            }

            
            card.addEventListener('click', (e) => {
                
                if (e.target.closest('.info-btn')) return;

                if (selectedGames.has(game.title)) {
                    selectedGames.delete(game.title);
                    card.classList.remove('selected');
                } else {
                    selectedGames.add(game.title);
                    card.classList.add('selected');
                }
                updateStorageUI();
            });

            
            if (selectedGames.has(game.title)) {
                card.classList.add('selected');
            }

            fragment.appendChild(card);
        });

        grid.appendChild(fragment);

        
        if (endIndex >= displayedGamesData.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'inline-block';
        }
    }

    
    loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        renderGrid(false); 
    });

    

    function openInfoModal(game) {
        modalTitle.innerText = game.title;
        const reqEntries = (game && game.system_requirements)
            ? Object.entries(game.system_requirements).filter(([, val]) => String(val ?? '').trim() !== '')
            : [];
        const infoEntries = (game && game.game_info)
            ? Object.entries(game.game_info)
            : [];

        appendDetailRows(modalReqs, reqEntries, 'Tidak ada data spesifikasi.');
        appendDetailRows(
            modalInfo,
            infoEntries.map(([key, val]) => [key, typeof val === 'boolean' ? (val ? 'Ya' : 'Tidak') : val]),
            'Tidak ada informasi tambahan.'
        );

        setOverlayState(modalOverlay, true);
    }

    function closeModal() {
        setOverlayState(modalOverlay, false);
    }

    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    
    function openExportModal() {
        if (totalUsedGB > currentHddCapacity) {
            showToast("Kapasitas HDD tidak memadai! Silakan kurangi game atau sesuaikan kapasitas HDD.", "error");
            return; 
        }

        exportTableBody.innerHTML = '';
        let totalExportSize = 0;
        let counter = 1;

        const selectedArr = getSelectedGames();
        
        if (selectedArr.length === 0) {
            exportTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 20px;">Belum ada game yang dipilih.</td></tr>`;
        } else {
            selectedArr.forEach(game => {
                const tr = document.createElement('tr');
                const sizeStr = formatSizeGB(Number.isFinite(game._estimatedSizeGB) ? game._estimatedSizeGB : 0);
                
                tr.innerHTML = `
                    <td>${counter}</td>
                    <td>${game.title}</td>
                    <td style="color: var(--accent); font-weight: 600;">${sizeStr}</td>
                `;
                exportTableBody.appendChild(tr);
                
                totalExportSize += Number.isFinite(game._estimatedSizeGB) ? game._estimatedSizeGB : 0;
                counter++;
            });
        }

        exportTotalSize.innerText = `${totalExportSize.toFixed(1)} GB`;

        setOverlayState(exportModal, true);
    }

    function closeExportModal() {
        setOverlayState(exportModal, false);
    }

    function buildExportText() {
        const selectedArr = getSelectedGames();
        const totalSize = totalUsedGB;

        if (selectedArr.length === 0) {
            return `Daftar Game Pesanan\n\n(Belum ada game yang dipilih)`;
        }

        const lines = [];
        lines.push('Daftar Game Pesanan');
        lines.push('');

        selectedArr.forEach((game, i) => {
            lines.push(`${i + 1}. ${formatExportTitle(game)}`);
        });

        lines.push('');
        lines.push(`Total Size: ${totalSize.toFixed(1)} GB`);
        return lines.join('\n');
    }

    async function copyTextToClipboard(text) {
        
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(text);
            return true;
        }

        
        const temp = document.createElement('textarea');
        temp.value = text;
        temp.setAttribute('readonly', '');
        temp.style.position = 'fixed';
        temp.style.left = '-9999px';
        temp.style.top = '0';
        document.body.appendChild(temp);
        temp.select();
        temp.setSelectionRange(0, temp.value.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(temp);
        return ok;
    }

    exportBtn.addEventListener('click', openExportModal);
    closeExportModalBtn.addEventListener('click', closeExportModal);
    exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) {
            closeExportModal();
        }
    });

    if (copyTextBtn) {
        copyTextBtn.addEventListener('click', async () => {
            try {
                const text = buildExportText();
                const ok = await copyTextToClipboard(text);
                if (!ok) throw new Error('Copy gagal');
                showToast('Teks daftar game berhasil di-copy!', 'success');
            } catch (err) {
                console.error('Copy text error:', err);
                showToast('Gagal copy teks. Coba browser lain / pakai HTTPS.', 'error');
            }
        });
    }

    
    function showToast(message, type = 'error') {
        
        const existingToasts = document.querySelectorAll('.toast-notification');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        
        
        const iconSvg = type === 'error' 
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="16 12 12 8 8 12"></polyline><line x1="12" y1="16" x2="12" y2="8"></line></svg>`;

        toast.innerHTML = `
            ${iconSvg}
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);

        
        setTimeout(() => toast.classList.add('show'), 10);

        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    
    searchInput.addEventListener('input', debounce((e) => {
        
        applyFilters();
    }, 250));

    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            currentCategory = e.target.value;
            applyFilters();
        });
    }

    
    (async () => {
        await loadSizeBufferConfig();
        if (!document.body.classList.contains('landing-active')) {
            await applyFilters();
        }
    })();
});

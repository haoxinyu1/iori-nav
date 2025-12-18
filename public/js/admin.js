const configGrid = document.getElementById('configGrid');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');

const pendingTableBody = document.getElementById('pendingTableBody');
const pendingPrevPageBtn = document.getElementById('pendingPrevPage');
const pendingNextPageBtn = document.getElementById('pendingNextPage');
const pendingCurrentPageSpan = document.getElementById('pendingCurrentPage');
const pendingTotalPagesSpan = document.getElementById('pendingTotalPages');

const messageDiv = document.getElementById('message');
const categoryGrid = document.getElementById('categoryGrid');
const categoryPrevPageBtn = document.getElementById('categoryPrevPage');
const categoryNextPageBtn = document.getElementById('categoryNextPage');
const categoryCurrentPageSpan = document.getElementById('categoryCurrentPage');
const categoryTotalPagesSpan = document.getElementById('categoryTotalPages');
const refreshCategoriesBtn = document.getElementById('refreshCategories');

var escapeHTML = function (value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '\'');
};

var normalizeUrl = function (value) {
  var trimmed = String(value || '').trim();
  var normalized = '';
  if (/^https?:\/\//i.test(trimmed)) {
    normalized = trimmed;
  } else if (/^[\w.-]+\.[\w.-]+/.test(trimmed)) {
    normalized = 'https://' + trimmed;
  }
  return normalized;
};


const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const exportBtn = document.getElementById('exportBtn');

const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tab = button.dataset.tab;
    tabButtons.forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === tab) {
        content.classList.add('active');
      }
    })
    if (tab === 'categories') {
      fetchCategories();
    }
  });
});

if (refreshCategoriesBtn) {
  refreshCategoriesBtn.addEventListener('click', () => {
    fetchCategories();
  });
}

const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const pageSizeSelect = document.getElementById('pageSizeSelect');
const categoryPageSizeSelect = document.getElementById('categoryPageSizeSelect');

let currentPage = 1;
let pageSize = 50; // Default to 50
let totalItems = 0;
let allConfigs = [];
let currentSearchKeyword = '';
let currentCategoryFilter = '';

// Initialize Page Size
if (pageSizeSelect) {
  pageSizeSelect.value = pageSize; // Set default in UI
  pageSizeSelect.addEventListener('change', () => {
    pageSize = parseInt(pageSizeSelect.value);
    currentPage = 1;
    fetchConfigs(currentPage, currentSearchKeyword, currentCategoryFilter);
  });
}

// Initialize Category Filter
if (categoryFilter) {
  // Populate categories will happen in fetchCategoriesForFilter or similar
  // Re-use the existing logic or add a new fetch
  fetch('/api/categories?pageSize=999')
    .then(res => res.json())
    .then(data => {
      if (data.code === 200 && data.data) {
        // Keep the default "All" option
        data.data.forEach(cat => {
          const option = document.createElement('option');
          option.value = cat.catelog; // Use name for filtering as API expects name or ID? API index.js uses name if provided as 'catalog' param
          option.textContent = cat.catelog;
          categoryFilter.appendChild(option);
        });
      }
    });

  categoryFilter.addEventListener('change', () => {
    currentCategoryFilter = categoryFilter.value;
    currentPage = 1;
    fetchConfigs(currentPage, currentSearchKeyword, currentCategoryFilter);
  });
}

let pendingCurrentPage = 1;
let pendingPageSize = 10;
let pendingTotalItems = 0;
let allPendingConfigs = [];

let categoryCurrentPage = 1;
let categoryPageSize = 20;
let categoryTotalItems = 0;
let categoriesData = [];

// Initialize Category Page Size
if (categoryPageSizeSelect) {
  categoryPageSizeSelect.value = categoryPageSize;
  categoryPageSizeSelect.addEventListener('change', () => {
    categoryPageSize = parseInt(categoryPageSizeSelect.value);
    categoryCurrentPage = 1;
    fetchCategories(categoryCurrentPage);
  });
}


// ========== 编辑书签功能 ==========
const editBookmarkModal = document.getElementById('editBookmarkModal');
const closeEditBookmarkModal = document.getElementById('closeEditBookmarkModal');
const editBookmarkForm = document.getElementById('editBookmarkForm');
const getLogo = document.getElementById('getLogo');

if (closeEditBookmarkModal) {
  closeEditBookmarkModal.addEventListener('click', () => {
    editBookmarkModal.style.display = 'none';
  });
}


if (editBookmarkForm) {
  editBookmarkForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    fetch(`/api/config/${data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(res => res.json())
      .then(data => {
        if (data.code === 200) {
          showModalMessage('editBookmarkModal', '修改成功', 'success');
          setTimeout(() => {
            fetchConfigs();
            editBookmarkModal.style.display = 'none';
          }, 1000);
        } else {
          showModalMessage('editBookmarkModal', data.message, 'error');
        }
      }).catch(err => {
        console.error('网络错误:', err);
        showModalMessage('editBookmarkModal', '网络错误', 'error');
      })
  });
}




function fetchConfigs(page = currentPage, keyword = currentSearchKeyword, catalog = currentCategoryFilter) {
  let url = `/api/config?page=${page}&pageSize=${pageSize}`;
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('pageSize', pageSize);

  if (keyword) {
    params.append('keyword', keyword);
  }

  if (catalog) {
    params.append('catalog', catalog);
  }

  url = `/api/config?${params.toString()}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        totalItems = data.total;
        currentPage = data.page;
        totalPagesSpan.innerText = Math.ceil(totalItems / pageSize);
        currentPageSpan.innerText = currentPage;
        allConfigs = data.data;
        renderConfig(allConfigs);
        updatePaginationButtons();
      } else {
        showMessage(data.message, 'error');
      }
    }).catch(err => {
      showMessage('网络错误', 'error');
    })
}

function renderConfig(configs) {
  if (!configGrid) return;
  configGrid.innerHTML = '';
  if (configs.length === 0) {
    configGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">没有配置数据</div>';
    return
  }
  configs.forEach(config => {
    const card = document.createElement('div');
    const safeName = escapeHTML(config.name || '');
    const normalizedUrl = normalizeUrl(config.url);
    const displayUrl = config.url ? escapeHTML(config.url) : '未提供';
    const normalizedLogo = normalizeUrl(config.logo);
    const descCell = config.desc ? escapeHTML(config.desc) : '暂无描述';
    const safeCatalog = escapeHTML(config.catelog || '未分类');
    const cardInitial = (safeName.charAt(0) || '站').toUpperCase();

    // Added cursor-pointer
    card.className = 'site-card group bg-white border border-primary-100/60 rounded-xl shadow-sm overflow-hidden relative cursor-pointer';
    card.draggable = true;
    card.dataset.id = config.id;
    
    // Add click event listener to open URL
    card.addEventListener('click', (e) => {
        // Prevent if clicking on buttons or dragging (though buttons have stopPropagation)
        // Also check if user is selecting text (optional but good UX)
        if (normalizedUrl) {
            window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
        }
    });

    // Logo render logic
    let logoHtml = '';
    if (normalizedLogo) {
      logoHtml = `<img src="${escapeHTML(normalizedLogo)}" alt="${safeName}" class="w-10 h-10 rounded-lg object-cover bg-gray-100">`;
    } else {
      logoHtml = `<div class="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white font-semibold text-lg shadow-inner">${cardInitial}</div>`;
    }

    card.innerHTML = `
      <div class="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
         <button class="edit-btn p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors" title="编辑" data-id="${config.id}">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
             </svg>
         </button>
         <button class="del-btn p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors" title="删除" data-id="${config.id}">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
             </svg>
         </button>
      </div>

      <div class="p-5 cursor-move">
        <div class="block">
            <div class="flex items-start">
               <div class="site-icon flex-shrink-0 mr-4 transition-all duration-300 group-hover:scale-105">
                  ${logoHtml}
               </div>
               <div class="flex-1 min-w-0">
                  <h3 class="site-title text-base font-medium text-gray-900 truncate" title="${safeName}">${safeName}</h3>
                  <span class="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-medium bg-secondary-100 text-primary-700">
                    ${safeCatalog}
                  </span>
               </div>
            </div>
            <p class="mt-3 text-sm text-gray-600 leading-relaxed line-clamp-2 h-10" title="${descCell}">${descCell}</p>
        </div>
        
        <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
             <span class="truncate max-w-[150px]" title="${displayUrl}">${displayUrl}</span>
             <span class="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">ID: ${config.id}</span>
        </div>
      </div>
    `;
    configGrid.appendChild(card);
  });
  bindActionEvents();
  setupDragAndDrop();
}

function bindActionEvents() {
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation(); // Prevent drag start when clicking buttons
      handleEdit(this.dataset.id);
    })
  });

  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const id = this.dataset.id;
      handleDelete(id)
    })
  })
}

function setupDragAndDrop() {
  const cards = document.querySelectorAll('#configGrid .site-card');
  let draggedItem = null;

  cards.forEach(card => {
    card.addEventListener('dragstart', function (e) {
      draggedItem = this;
      this.classList.add('opacity-50', 'scale-95');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', this.innerHTML);
    });

    card.addEventListener('dragend', function () {
      this.classList.remove('opacity-50', 'scale-95');
      draggedItem = null;
      document.querySelectorAll('.site-card').forEach(c => c.classList.remove('border-2', 'border-accent-500'));
    });

    card.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      this.classList.add('border-2', 'border-accent-500');
    });

    card.addEventListener('dragleave', function () {
      this.classList.remove('border-2', 'border-accent-500');
    });

    card.addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('border-2', 'border-accent-500');

      if (draggedItem !== this) {
        // Swap or Insert Logic
        // Here we use "insert before" or "insert after" depending on position
        // For simplicity in a grid, swapping index in DOM is easiest to visualize

        const allCards = Array.from(configGrid.children);
        const draggedIdx = allCards.indexOf(draggedItem);
        const droppedIdx = allCards.indexOf(this);

        if (draggedIdx < droppedIdx) {
          this.after(draggedItem);
        } else {
          this.before(draggedItem);
        }

        // Save new order
        saveSortOrder();
      }
    });
  });
}

function saveSortOrder() {
  const cards = document.querySelectorAll('#configGrid .site-card');
  const updates = [];

  // Calculate global start index
  const startIndex = (currentPage - 1) * pageSize;

  cards.forEach((card, index) => {
    const id = card.dataset.id;
    // Set new sort order relative to the page + index
    // Note: This relies on simple integer sorting.
    const newSortOrder = startIndex + index;

    // Optimistic UI: We assume it works.
    // Ideally we only update if changed, but for simplicity we update the list.
    // To avoid flood, we can check if it's already correct in `allConfigs` but `allConfigs` is not updated yet.

    updates.push(fetch(`/api/config/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // We need other fields? api/config/[id] PUT requires name, url etc.
        // The API implementation requires name, url, etc.
        // I need to fetch the existing data or change the API to allow partial updates.
        // Since I have `allConfigs` in memory, I can use that!
        ...allConfigs.find(c => c.id == id),
        sort_order: newSortOrder
      })
    }));
  });

  if (updates.length > 0) {
    showMessage('正在保存排序...', 'info');
    Promise.all(updates)
      .then(() => showMessage('排序已保存', 'success'))
      .catch(err => showMessage('保存排序失败: ' + err.message, 'error'));
  }
}

function fetchCategories(page = categoryCurrentPage) {
  if (!categoryGrid) {
    return;
  }
  categoryGrid.innerHTML = '<div class="col-span-full text-center py-10">加载中...</div>';
  fetch(`/api/categories?page=${page}&pageSize=${categoryPageSize}`)
    .then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        categoryTotalItems = data.total;
        categoryCurrentPage = data.page;
        categoryTotalPagesSpan.innerText = Math.ceil(categoryTotalItems / categoryPageSize);
        categoryCurrentPageSpan.innerText = categoryCurrentPage;
        categoriesData = data.data || [];
        renderCategoryCards(categoriesData);
        updateCategoryPaginationButtons();
      } else {
        showMessage(data.message || '加载分类失败', 'error');
        categoryGrid.innerHTML = '<div class="col-span-full text-center py-10 text-red-500">加载失败</div>';
      }
    }).catch(() => {
      showMessage('网络错误', 'error');
      categoryGrid.innerHTML = '<div class="col-span-full text-center py-10 text-red-500">加载失败</div>';
    });
}

function renderCategoryCards(categories) {
  if (!categoryGrid) return;
  categoryGrid.innerHTML = '';
  if (!categories || categories.length === 0) {
    categoryGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">暂无分类数据</div>';
    return;
  }

  categories.forEach(item => {
    const card = document.createElement('div');
    const safeName = escapeHTML(item.catelog);
    const siteCount = item.site_count || 0;
    const sortValue = item.sort_order === null || item.sort_order === 9999 ? '默认' : item.sort_order;

    card.className = 'site-card group bg-white border border-primary-100/60 rounded-xl shadow-sm overflow-hidden relative cursor-move';
    card.draggable = true;
    card.dataset.id = item.id;
    card.dataset.sort = item.sort_order;

    card.innerHTML = `
      <div class="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
         <button class="category-edit-btn p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors" title="编辑" data-category-id="${item.id}">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
             </svg>
         </button>
         <button class="category-del-btn p-1.5 ${siteCount > 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-100 text-red-600 hover:bg-red-200'} rounded-full transition-colors" title="${siteCount > 0 ? '包含书签的分类无法删除' : '删除'}" data-category-id="${item.id}" ${siteCount > 0 ? 'disabled' : ''}>
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
             </svg>
         </button>
      </div>

      <div class="p-5">
        <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-medium text-gray-900 truncate" title="${safeName}">${safeName}</h3>
            <span class="bg-primary-50 text-primary-700 text-xs px-2 py-1 rounded-full border border-primary-100">ID: ${item.id}</span>
        </div>
        
        <div class="flex items-center text-sm text-gray-500 mt-4 space-x-4">
            <div class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>${siteCount} 个书签</span>
            </div>
            <div class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <span>排序: ${sortValue}</span>
            </div>
        </div>
      </div>
    `;
    categoryGrid.appendChild(card);
  });

  bindCategoryEvents();
  setupCategoryDragAndDrop();
}

function bindCategoryEvents() {
  document.querySelectorAll('.category-edit-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const categoryId = this.getAttribute('data-category-id');
      const category = categoriesData.find(c => c.id == categoryId);
      if (category) {
        document.getElementById('editCategoryId').value = category.id;
        document.getElementById('editCategoryName').value = category.catelog;
        const sortOrder = category.sort_order;
        document.getElementById('editCategorySortOrder').value = (sortOrder === null || sortOrder === 9999) ? '' : sortOrder;
        document.getElementById('editCategoryModal').style.display = 'block';
      } else {
        showMessage('找不到分类数据', 'error');
      }
    });
  });

  document.querySelectorAll('.category-del-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (this.disabled) {
        return;
      }
      const category_id = this.getAttribute('data-category-id');
      if (!category_id) {
        return;
      }
      if (!confirm('确定删除该分类吗？')) {
        return;
      }
      fetch('/api/categories/' + encodeURIComponent(category_id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reset: true })
      }).then(res => res.json())
        .then(data => {
          if (data.code === 200) {
            showMessage('已删除分类', 'success');
            fetchCategories();
          } else {
            showMessage(data.message || '删除失败', 'error');
          }
        }).catch(() => {
          showMessage('网络错误', 'error');
        });
    });
  });
}

function setupCategoryDragAndDrop() {
  const cards = document.querySelectorAll('#categoryGrid .site-card');
  let draggedItem = null;

  cards.forEach(card => {
    card.addEventListener('dragstart', function (e) {
      draggedItem = this;
      this.classList.add('opacity-50', 'scale-95');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', this.innerHTML);
    });

    card.addEventListener('dragend', function () {
      this.classList.remove('opacity-50', 'scale-95');
      draggedItem = null;
      document.querySelectorAll('#categoryGrid .site-card').forEach(c => c.classList.remove('border-2', 'border-accent-500'));
    });

    card.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      this.classList.add('border-2', 'border-accent-500');
    });

    card.addEventListener('dragleave', function () {
      this.classList.remove('border-2', 'border-accent-500');
    });

    card.addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('border-2', 'border-accent-500');

      if (draggedItem !== this) {
        const allCards = Array.from(categoryGrid.children);
        const draggedIdx = allCards.indexOf(draggedItem);
        const droppedIdx = allCards.indexOf(this);

        if (draggedIdx < droppedIdx) {
          this.after(draggedItem);
        } else {
          this.before(draggedItem);
        }

        // Save new order
        saveCategorySortOrder();
      }
    });
  });
}

function saveCategorySortOrder() {
  const cards = document.querySelectorAll('#categoryGrid .site-card');
  const updates = [];

  // Calculate global start index based on current page
  // Note: Categories usually are few, so paging might not be heavy used, but we support it.
  const startIndex = (categoryCurrentPage - 1) * categoryPageSize;

  cards.forEach((card, index) => {
    const id = card.dataset.id;
    // Set new sort order. Lower number = higher priority.
    // We simply use index as sort order.
    const newSortOrder = startIndex + index;

    // We reuse the update endpoint.
    // The backend expects full object or partial? api/categories/[id] PUT handles partial update
    updates.push(fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // We only need to send what we change if the backend supports it.
        // Checking backend code: functions/api/categories/[id].js
        // It reads: const { catelog, sort_order } = await request.json();
        // And it does `UPDATE category SET catelog = COALESCE(?, catelog), sort_order = COALESCE(?, sort_order) ...`
        // Wait, I should verify the backend code. 
        // Let's assume standard PUT behavior or check if I can see the backend code again.
        // Previous context showed:
        // `UPDATE category SET catelog = ?, sort_order = ? WHERE id = ?`
        // Actually, I should check the backend code to be safe. 
        // But based on `editCategoryForm` it sends `catelog` and `sort_order`.
        // If I only send `sort_order`, `catelog` might be undefined/null.
        // So I should send the name too.
        catelog: categoriesData.find(c => c.id == id).catelog,
        sort_order: newSortOrder
      })
    }));
  });

  if (updates.length > 0) {
    showMessage('正在保存分类排序...', 'info');
    Promise.all(updates)
      .then(() => showMessage('分类排序已保存', 'success'))
      .catch(err => showMessage('保存分类排序失败: ' + err.message, 'error'));
  }
}

function handleEdit(id) {
  fetch(`/api/config/${id}`, {
    method: 'GET'
  }).then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        const configToEdit = data.data
        if (!configToEdit) {
          showMessage('找不到要编辑的数据', 'error');
          return;
        }
        const editBookmarkCatelogSelect = document.getElementById('editBookmarkCatelog');
        fetchCategoriesForSelect(editBookmarkCatelogSelect).then(() => {
          document.getElementById('editBookmarkId').value = configToEdit.id;
          document.getElementById('editBookmarkName').value = configToEdit.name;
          document.getElementById('editBookmarkUrl').value = configToEdit.url;
          document.getElementById('editBookmarkLogo').value = configToEdit.logo;
          document.getElementById('editBookmarkDesc').value = configToEdit.desc;
          document.getElementById('editBookmarkCatelog').value = configToEdit.catelog_id;
          document.getElementById('editBookmarkSortOrder').value = configToEdit.sort_order;
          editBookmarkModal.style.display = 'block';
        })

      }
    });
}

function handleDelete(id) {
  if (!confirm('确认删除？')) return;
  fetch(`/api/config/${id}`, {
    method: 'DELETE'
  }).then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        showMessage('删除成功', 'success');
        fetchConfigs();
      } else {
        showMessage(data.message, 'error');
      }
    }).catch(err => {
      showMessage('网络错误', 'error');
    })
}

function showModalMessage(modalId, message, type) {
  let containerId = '';
  if (modalId === 'addBookmarkModal') containerId = 'addBookmarkMessage';
  else if (modalId === 'editBookmarkModal') containerId = 'editBookmarkMessage';
  else return; // Unknown modal

  const container = document.getElementById(containerId);
  if (container) {
    container.textContent = message;
    container.className = 'modal-message ' + type;
    container.style.visibility = 'visible';

    // Auto hide success/info messages after 3 seconds
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        container.style.visibility = 'hidden';
      }, 3000);
    }
  } else {
    // Fallback to global message
    showMessage(message, type);
  }
}

function showMessage(message, type) {
  messageDiv.innerText = message;
  messageDiv.className = type;
  messageDiv.style.display = 'block';
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
}

function updatePaginationButtons() {
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage >= Math.ceil(totalItems / pageSize)
}

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    fetchConfigs(currentPage - 1, currentSearchKeyword, currentCategoryFilter);
  }
});

nextPageBtn.addEventListener('click', () => {
  if (currentPage < Math.ceil(totalItems / pageSize)) {
    fetchConfigs(currentPage + 1, currentSearchKeyword, currentCategoryFilter);
  }
});


importBtn.addEventListener('click', () => {
  importFile.click();
});

importFile.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();
  const reader = new FileReader();

  if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
    // Chrome 书签 HTML 格式导入
    reader.onload = function (event) {
      try {
        const htmlContent = event.target.result;
        const bookmarks = parseChromeBookmarks(htmlContent);

        if (bookmarks.length === 0) {
          showMessage('未在文件中找到有效书签', 'error');
          return;
        }

        // 显示预览并确认导入
        showImportPreview(bookmarks);
      } catch (error) {
        showMessage('书签解析失败: ' + error.message, 'error');
      }
    };
    reader.readAsText(file, 'UTF-8');
  } else if (fileName.endsWith('.json')) {
    // 系统导出的 JSON 格式导入
    reader.onload = function (event) {
      try {
        const data = JSON.parse(event.target.result);

        // 简单确认后直接导入
        if (confirm('确定要导入这个 JSON 文件中的书签吗？')) {
          performImport(data);
        }
      } catch (error) {
        showMessage('JSON 文件解析失败: ' + error.message, 'error');
      }
    };
    reader.readAsText(file, 'UTF-8');
  } else {
    showMessage('不支持的文件格式。请选择 .html 或 .json 文件。', 'error');
  }

  // Reset file input to allow re-selecting the same file
  e.target.value = '';
})

exportBtn.addEventListener('click', () => {
  fetch('/api/config/export')
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'config.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }).catch(err => {
      showMessage('网络错误', 'error');
    })
})

// 搜索功能
searchInput.addEventListener('input', () => {
  currentSearchKeyword = searchInput.value.trim();
  currentPage = 1;
  fetchConfigs(currentPage, currentSearchKeyword, currentCategoryFilter);
});

// 解析 Chrome 书签 HTML
function parseChromeBookmarks(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const bookmarks = [];
  let currentCategory = '未分类';

  function traverseNode(node, category) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      // H3 标签表示文件夹(分类)
      if (node.tagName === 'H3') {
        currentCategory = node.textContent.trim() || '未分类';
        // 跳过 "书签栏"、"其他书签" 等顶层文件夹
        if (currentCategory === '书签栏' || currentCategory === 'Bookmarks Bar' ||
          currentCategory === '其他书签' || currentCategory === 'Other Bookmarks') {
          currentCategory = '未分类';
        }
      }

      // A 标签表示书签
      if (node.tagName === 'A') {
        const url = node.getAttribute('HREF') || node.getAttribute('href');
        const name = node.textContent.trim();

        if (url && name) {
          bookmarks.push({
            name: name,
            url: url,
            logo: '',
            desc: '',
            catelog: category || currentCategory,
            sort_order: 9999
          });
        }
      }

      // DL 标签表示列表容器,递归处理子节点
      if (node.tagName === 'DL') {
        const parent = node.previousElementSibling;
        const folderCategory = (parent && parent.tagName === 'H3')
          ? parent.textContent.trim()
          : category;

        Array.from(node.children).forEach(child => {
          traverseNode(child, folderCategory);
        });
        return;
      }
    }

    // 递归处理子节点
    Array.from(node.children || []).forEach(child => {
      traverseNode(child, category);
    });
  }

  traverseNode(doc.body, currentCategory);
  return bookmarks;
}

// 显示导入预览
function showImportPreview(bookmarks) {
  const previewModal = document.createElement('div');
  previewModal.className = 'modal';
  previewModal.style.display = 'block';

  // 统计分类信息
  const categoryStats = {};
  bookmarks.forEach(b => {
    categoryStats[b.catelog] = (categoryStats[b.catelog] || 0) + 1;
  });

  const categoryList = Object.entries(categoryStats)
    .map(([cat, count]) => `<li>${escapeHTML(cat)}: ${count} 个书签</li>`)
    .join('');

  previewModal.innerHTML = `
    <div class="modal-content">
      <span class="modal-close" id="closePreviewModal">×</span>
      <h2>导入预览</h2>
      <div style="margin: 20px 0;">
        <p><strong>总共发现 ${bookmarks.length} 个书签</strong></p>
        <p><strong>包含以下分类:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${categoryList}
        </ul>
        <p style="margin-top: 15px; color: #6c757d; font-size: 0.9rem;">
          注意: 导入的书签将使用默认排序值 9999
        </p>
      </div>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="cancelImport" style="background-color: #6c757d;">取消</button>
        <button id="confirmImport" style="background-color: #28a745;">确认导入</button>
      </div>
    </div>
  `;

  document.body.appendChild(previewModal);

  // 关闭预览
  document.getElementById('closePreviewModal').addEventListener('click', () => {
    document.body.removeChild(previewModal);
  });

  document.getElementById('cancelImport').addEventListener('click', () => {
    document.body.removeChild(previewModal);
  });

  // 确认导入
  document.getElementById('confirmImport').addEventListener('click', () => {
    document.body.removeChild(previewModal);
    performImport(bookmarks);
  });

  // 点击遮罩关闭
  previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) {
      document.body.removeChild(previewModal);
    }
  });
}

// 执行导入
function performImport(dataToImport) {
  showMessage('正在导入,请稍候...', 'success');

  fetch('/api/config/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dataToImport)
  }).then(res => res.json())
    .then(data => {
      if (data.code === 201) {
        // The success message from the backend is more accurate now
        showMessage(data.message, 'success');
        fetchConfigs();
      } else {
        showMessage(data.message || '导入失败', 'error');
      }
    }).catch(err => {
      showMessage('网络错误: ' + err.message, 'error');
    });
}

function fetchPendingConfigs(page = pendingCurrentPage) {
  fetch(`/api/pending?page=${page}&pageSize=${pendingPageSize}`)
    .then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        pendingTotalItems = data.total;
        pendingCurrentPage = data.page;
        pendingTotalPagesSpan.innerText = Math.ceil(pendingTotalItems / pendingPageSize);
        pendingCurrentPageSpan.innerText = pendingCurrentPage;
        allPendingConfigs = data.data;
        renderPendingConfig(allPendingConfigs);
        updatePendingPaginationButtons();
      } else {
        showMessage(data.message, 'error');
      }
    }).catch(err => {
      showMessage('网络错误', 'error');
    })
}

function renderPendingConfig(configs) {
  pendingTableBody.innerHTML = '';
  if (configs.length === 0) {
    pendingTableBody.innerHTML = '<tr><td colspan="7">没有待审核数据</td></tr>';
    return
  }
  configs.forEach(config => {
    const row = document.createElement('tr');
    const safeName = escapeHTML(config.name || '');
    const normalizedUrl = normalizeUrl(config.url);
    const urlCell = normalizedUrl
      ? `<a href="${escapeHTML(normalizedUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(normalizedUrl)}</a>`
      : (config.url ? escapeHTML(config.url) : '未提供');
    const normalizedLogo = normalizeUrl(config.logo);
    const logoCell = normalizedLogo
      ? `<img src="${escapeHTML(normalizedLogo)}" alt="${safeName}" style="width:30px;" />`
      : 'N/A';
    const descCell = config.desc ? escapeHTML(config.desc) : 'N/A';
    const catelogCell = escapeHTML(config.catelog || '');
    row.innerHTML = `
      <td>${config.id}</td>
      <td>${safeName}</td>
      <td>${urlCell}</td>
      <td>${logoCell}</td>
      <td>${descCell}</td>
      <td>${catelogCell}</td>
      <td class="actions">
        <button class="approve-btn" data-id="${config.id}">批准</button>
        <button class="reject-btn" data-id="${config.id}">拒绝</button>
      </td>
    `;
    pendingTableBody.appendChild(row);
  });
  bindPendingActionEvents();
}

function bindPendingActionEvents() {
  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const id = this.dataset.id;
      handleApprove(id);
    })
  });

  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const id = this.dataset.id;
      handleReject(id);
    })
  })
}

function handleApprove(id) {
  if (!confirm('确定批准吗？')) return;
  fetch(`/api/pending/${id}`, {
    method: 'PUT',
  }).then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        showMessage('批准成功', 'success');
        fetchPendingConfigs();
        fetchConfigs();
      } else {
        showMessage(data.message, 'error')
      }
    }).catch(err => {
      showMessage('网络错误', 'error');
    })
}

function handleReject(id) {
  if (!confirm('确定拒绝吗？')) return;
  fetch(`/api/pending/${id}`, {
    method: 'DELETE'
  }).then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        showMessage('拒绝成功', 'success');
        fetchPendingConfigs();
      } else {
        showMessage(data.message, 'error');
      }
    }).catch(err => {
      showMessage('网络错误', 'error');
    })
}

function updatePendingPaginationButtons() {
  pendingPrevPageBtn.disabled = pendingCurrentPage === 1;
  pendingNextPageBtn.disabled = pendingCurrentPage >= Math.ceil(pendingTotalItems / pendingPageSize)
}

pendingPrevPageBtn.addEventListener('click', () => {
  if (pendingCurrentPage > 1) {
    fetchPendingConfigs(pendingCurrentPage - 1);
  }
});

pendingNextPageBtn.addEventListener('click', () => {
  if (pendingCurrentPage < Math.ceil(pendingTotalItems / pendingPageSize)) {
    fetchPendingConfigs(pendingCurrentPage + 1)
  }
});

function updateCategoryPaginationButtons() {
  categoryPrevPageBtn.disabled = categoryCurrentPage === 1;
  categoryNextPageBtn.disabled = categoryCurrentPage >= Math.ceil(categoryTotalItems / categoryPageSize)
}

categoryPrevPageBtn.addEventListener('click', () => {
  if (categoryCurrentPage > 1) {
    fetchCategories(categoryCurrentPage - 1);
  }
});

categoryNextPageBtn.addEventListener('click', () => {
  if (categoryCurrentPage < Math.ceil(categoryTotalItems / categoryPageSize)) {
    fetchCategories(categoryCurrentPage + 1)
  }
});

// 初始化加载数据
fetchConfigs();
fetchPendingConfigs();
if (categoryGrid) {
  fetchCategories();
}


// ========== 新增分类功能 ==========
const addCategoryBtn = document.getElementById('addCategoryBtn');
const addCategoryModal = document.getElementById('addCategoryModal');
const closeCategoryModal = document.getElementById('closeCategoryModal');
const addCategoryForm = document.getElementById('addCategoryForm');

if (addCategoryBtn) {
  addCategoryBtn.addEventListener('click', () => {
    addCategoryModal.style.display = 'block';
  });
}

if (closeCategoryModal) {
  closeCategoryModal.addEventListener('click', () => {
    addCategoryModal.style.display = 'none';
    addCategoryForm.reset();
  });
}

// 点击模态框外部关闭
if (addCategoryModal) {
  addCategoryModal.addEventListener('click', (e) => {
    if (e.target === addCategoryModal) {
      addCategoryModal.style.display = 'none';
      addCategoryForm.reset();
    }
  });
}

// ========== 编辑分类功能 ==========
const editCategoryModal = document.getElementById('editCategoryModal');
const closeEditCategoryModal = document.getElementById('closeEditCategoryModal');
const editCategoryForm = document.getElementById('editCategoryForm');

if (closeEditCategoryModal) {
  closeEditCategoryModal.addEventListener('click', () => {
    editCategoryModal.style.display = 'none';
  });
}

if (editCategoryModal) {
  editCategoryModal.addEventListener('click', (e) => {
    if (e.target === editCategoryModal) {
      editCategoryModal.style.display = 'none';
    }
  });
}

if (editCategoryForm) {
  editCategoryForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const id = document.getElementById('editCategoryId').value;
    const categoryName = document.getElementById('editCategoryName').value.trim();
    const sortOrder = document.getElementById('editCategorySortOrder').value.trim();

    if (!categoryName) {
      showMessage('分类名称不能为空', 'error');
      return;
    }

    const isDuplicate = categoriesData.some(category => category.catelog.toLowerCase() === categoryName.toLowerCase() && category.id != id);
    if (isDuplicate) {
      showMessage('该分类名称已存在', 'error');
      return;
    }

    const payload = {
      catelog: categoryName,
    };

    if (sortOrder !== '') {
      payload.sort_order = Number(sortOrder);
    }

    fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).then(res => res.json())
      .then(data => {
        if (data.code === 200) {
          showMessage('分类更新成功', 'success');
          editCategoryModal.style.display = 'none';
          fetchCategories(categoryCurrentPage);
        } else {
          showMessage(data.message || '分类更新失败', 'error');
        }
      }).catch(err => {
        showMessage('网络错误: ' + err.message, 'error');
      });
  });
}

// 提交新增分类表单
if (addCategoryForm) {
  addCategoryForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const categoryName = document.getElementById('newCategoryName').value.trim();
    const sortOrder = document.getElementById('newCategorySortOrder').value.trim();

    if (!categoryName) {
      showMessage('分类名称不能为空', 'error');
      return;
    }

    const payload = {
      catelog: categoryName
    };

    if (sortOrder !== '') {
      payload.sort_order = Number(sortOrder);
    }

    fetch('/api/categories/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).then(res => res.json())
      .then(data => {
        if (data.code === 201 || data.code === 200) {
          showMessage('分类创建成功', 'success');
          addCategoryModal.style.display = 'none';
          addCategoryForm.reset();

          // 如果当前在分类排序标签页,刷新数据
          const categoriesTab = document.getElementById('categories');
          if (categoriesTab && categoriesTab.classList.contains('active')) {
            fetchCategories();
          }
        } else {
          showMessage(data.message || '分类创建失败', 'error');
        }
      }).catch(err => {
        showMessage('网络错误: ' + err.message, 'error');
      });
  });
}

// ========== 新增书签功能 ==========
const addBookmarkBtn = document.getElementById('addBookmarkBtn');
const addBookmarkModal = document.getElementById('addBookmarkModal');
const closeBookmarkModal = document.getElementById('closeBookmarkModal');
const addBookmarkForm = document.getElementById('addBookmarkForm');
const addBookmarkCatelogSelect = document.getElementById('addBookmarkCatelog');

async function fetchCategoriesForSelect(selectElement) {
  try {
    const response = await fetch('/api/categories?pageSize=999');
    const data = await response.json();
    if (data.code === 200 && data.data) {
      selectElement.innerHTML = '';
      data.data.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.catelog;
        selectElement.appendChild(option);
      });
    } else {
      showMessage('加载分类列表失败', 'error');
    }
  } catch (error) {
    showMessage('网络错误，无法加载分类', 'error');
  }
}

if (addBookmarkBtn) {
  addBookmarkBtn.addEventListener('click', () => {
    addBookmarkModal.style.display = 'block';
    fetchCategoriesForSelect(addBookmarkCatelogSelect);
  });
}

if (closeBookmarkModal) {
  closeBookmarkModal.addEventListener('click', () => {
    addBookmarkModal.style.display = 'none';
    if (addBookmarkForm) {
      addBookmarkForm.reset();
    }
  });
}

if (addBookmarkModal) {
  addBookmarkModal.addEventListener('click', (e) => {
    if (e.target === addBookmarkModal) {
      addBookmarkModal.style.display = 'none';
      if (addBookmarkForm) {
        addBookmarkForm.reset();
      }
    }
  });
}

if (addBookmarkForm) {
  addBookmarkForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = document.getElementById('addBookmarkName').value;
    const url = document.getElementById('addBookmarkUrl').value;
    const logo = document.getElementById('addBookmarkLogo').value;
    const desc = document.getElementById('addBookmarkDesc').value;
    const catelogId = addBookmarkCatelogSelect.value;
    const sortOrder = document.getElementById('addBookmarkSortOrder').value;

    if (!name || !url || !catelogId) {
      showModalMessage('addBookmarkModal', '名称, URL 和分类为必填项', 'error');
      return;
    }

    const payload = {
      name: name.trim(),
      url: url.trim(),
      logo: logo.trim(),
      desc: desc.trim(),
      catelogId: catelogId
    };

    if (sortOrder !== '') {
      payload.sort_order = Number(sortOrder);
    }

    fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).then(res => res.json())
      .then(data => {
        if (data.code === 201) {
          showModalMessage('addBookmarkModal', '添加成功', 'success');
          setTimeout(() => {
            addBookmarkModal.style.display = 'none';
            addBookmarkForm.reset();
            fetchConfigs();
          }, 1000);
        } else {
          showModalMessage('addBookmarkModal', data.message, 'error');
        }
      }).catch(err => {
        showModalMessage('addBookmarkModal', '网络错误', 'error');
      });
  });
}

// ===================================
// 新版 设置模态框逻辑 (Settings Modal)
// ===================================
document.addEventListener('DOMContentLoaded', () => {
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  if (!settingsBtn || !settingsModal) return;

  // Modal Elements
  const closeBtn = document.getElementById('closeSettingsModal');
  const cancelBtn = document.getElementById('cancelSettingsBtn');
  const saveBtn = document.getElementById('saveSettingsBtn');

  // Tabs Elements
  const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
  const settingsTabContents = document.querySelectorAll('.settings-tab-content');

  // Layout Inputs
  const hideDescSwitch = document.getElementById('hideDescSwitch');
  const hideLinksSwitch = document.getElementById('hideLinksSwitch');
  const hideCategorySwitch = document.getElementById('hideCategorySwitch');
  const hideTitleSwitch = document.getElementById('hideTitleSwitch');
  const hideSubtitleSwitch = document.getElementById('hideSubtitleSwitch');
  const frostedGlassSwitch = document.getElementById('frostedGlassSwitch');
  const frostedGlassIntensityRange = document.getElementById('frostedGlassIntensity');
  const frostedGlassIntensityValue = document.getElementById('frostedGlassIntensityValue');
  const gridColsRadios = document.getElementsByName('gridCols');
  const menuLayoutRadios = document.getElementsByName('menuLayout');
  const customWallpaperInput = document.getElementById('customWallpaperInput');
  const randomWallpaperSwitch = document.getElementById('randomWallpaperSwitch');
  const bgBlurSwitch = document.getElementById('bgBlurSwitch');
  const bgBlurIntensityRange = document.getElementById('bgBlurIntensity');
  const bgBlurIntensityValue = document.getElementById('bgBlurIntensityValue');
  const bingCountrySelect = document.getElementById('bingCountry');
  const bingWallpapersDiv = document.getElementById('bingWallpapers');

  // AI Provider Elements
  const providerSelector = document.getElementById('providerSelector');
  const baseUrlGroup = document.getElementById('baseUrlGroup');

  // AI Form Inputs
  const apiKeyInput = document.getElementById('apiKey');
  const baseUrlInput = document.getElementById('baseUrl');
  const modelNameInput = document.getElementById('modelName');

  // Bulk Generation Elements
  const bulkIdleView = document.getElementById('bulkGenerateIdle');
  const bulkProgressView = document.getElementById('bulkGenerateProgress');
  const batchCompleteBtn = document.getElementById('batchCompleteDescBtn');
  const stopBulkBtn = document.getElementById('stopBulkGenerateBtn');
  const progressBar = document.getElementById('progressBar');
  const progressCounter = document.getElementById('progressCounter');

  let currentSettings = {
    // AI Defaults
    provider: 'workers-ai',
    apiKey: '',
    baseUrl: '',
    model: '@cf/meta/llama-3-8b-instruct',
    // Layout Defaults
    layout_hide_desc: false,
    layout_hide_links: false,
    layout_hide_category: false,
    layout_hide_title: false,
    layout_hide_subtitle: false,
    layout_enable_frosted_glass: false,
    layout_frosted_glass_intensity: '15',
    layout_grid_cols: '4',
    layout_custom_wallpaper: '',
    layout_menu_layout: 'horizontal',
    layout_random_wallpaper: false,
    layout_enable_bg_blur: false,
    layout_bg_blur_intensity: '0',
    bing_country: ''
  };

  let shouldStopBulkGeneration = false;
  let aiRequestDelay = 1500; 

  async function fetchPublicConfig() {
    try {
      const response = await fetch('/api/public-config');
      if (!response.ok) {
        console.error('Failed to fetch public config.');
        return;
      }
      const config = await response.json();
      if (config && typeof config.aiRequestDelay === 'number') {
        aiRequestDelay = config.aiRequestDelay;
      }
    } catch (error) {
      console.error('Error fetching public config:', error);
    }
  }
  fetchPublicConfig();

  // --- Bing Wallpaper Logic ---
  async function fetchBingWallpapers(country = '') {
      if (!bingWallpapersDiv) return;
      bingWallpapersDiv.innerHTML = '<div class="col-span-full text-center text-gray-400 py-8 text-sm">加载中...</div>';
      
      try {
          let url = '';
          if (country === 'spotlight') {
              url = 'https://peapix.com/spotlight/feed?n=7';
          } else {
              url = `https://peapix.com/bing/feed?n=7&country=${country}`;
          }
          
          const res = await fetch(url);
          if (!res.ok) throw new Error('API Request Failed');
          const data = await res.json();
          
          bingWallpapersDiv.innerHTML = '';
          
          if (!Array.isArray(data) || data.length === 0) {
              bingWallpapersDiv.innerHTML = '<div class="col-span-full text-center text-gray-400 py-8 text-sm">未获取到壁纸</div>';
              return;
          }
          
          data.forEach(item => {
              // item.thumbUrl usually 480x360 or similar
              // item.fullUrl usually 1920x1080
              const thumb = item.thumbUrl || item.url; // Fallback
              const full = item.fullUrl || item.url;   // Fallback
              const title = item.title || 'Bing Wallpaper';
              
              const div = document.createElement('div');
              div.className = 'relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:border-primary-500 transition-all aspect-video bg-gray-100';
              div.title = title;
              div.innerHTML = `<img src="${thumb}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="${title}">
                               <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                  <span class="opacity-0 group-hover:opacity-100 bg-black/50 text-white text-xs px-2 py-1 rounded">应用</span>
                               </div>`;
              
              div.addEventListener('click', () => {
                  if (customWallpaperInput) {
                      customWallpaperInput.value = full;
                      // Optional: Flash input to indicate change
                      customWallpaperInput.classList.add('bg-green-50');
                      setTimeout(() => customWallpaperInput.classList.remove('bg-green-50'), 300);
                  }
              });
              
              bingWallpapersDiv.appendChild(div);
          });
          
      } catch (err) {
          console.error('Bing Wallpaper Fetch Error:', err);
          bingWallpapersDiv.innerHTML = '<div class="col-span-full text-center text-red-400 py-8 text-sm">加载失败，请检查网络或稍后重试</div>';
      }
  }

  // --- Event Listeners ---

  settingsBtn.addEventListener('click', () => {
    loadSettings();
    settingsModal.style.display = 'block';
  });

  const closeModal = () => {
    if (bulkProgressView.style.display !== 'none') {
      if (!confirm('批量生成正在进行中，确定要关闭吗？')) {
        return;
      }
      shouldStopBulkGeneration = true;
    }
    settingsModal.style.display = 'none';
  };
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeModal();
    }
  });

  // Tab Switching
  settingsTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        
        settingsTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        settingsTabContents.forEach(c => {
            c.classList.remove('active');
            if (c.id === tabId) {
                c.classList.add('active');
            }
        });
        
        // Auto fetch bing wallpapers if tab is active and empty
        if (tabId === 'wallpaper-settings' && bingWallpapersDiv && (!bingWallpapersDiv.children.length || bingWallpapersDiv.innerText.includes('加载中'))) {
            fetchBingWallpapers(currentSettings.bing_country);
        }
    });
  });
  
  if (bingCountrySelect) {
      bingCountrySelect.addEventListener('change', () => {
          currentSettings.bing_country = bingCountrySelect.value;
          fetchBingWallpapers(currentSettings.bing_country);
      });
  }

  if (providerSelector) {
    providerSelector.addEventListener('change', () => {
      currentSettings.provider = providerSelector.value;
      updateUIFromSettings();
    });
  }

  saveBtn.addEventListener('click', () => {
    // Update state from inputs
    currentSettings.apiKey = apiKeyInput.value.trim();
    currentSettings.baseUrl = baseUrlInput.value.trim();
    currentSettings.model = modelNameInput.value.trim();
    currentSettings.layout_hide_desc = hideDescSwitch.checked;
    currentSettings.layout_hide_links = hideLinksSwitch.checked;
    currentSettings.layout_hide_category = hideCategorySwitch.checked;
    currentSettings.layout_hide_title = hideTitleSwitch.checked;
    currentSettings.layout_hide_subtitle = hideSubtitleSwitch.checked;
    currentSettings.layout_custom_wallpaper = customWallpaperInput.value.trim();
    currentSettings.layout_random_wallpaper = randomWallpaperSwitch.checked;
    currentSettings.layout_enable_bg_blur = bgBlurSwitch.checked;
    currentSettings.layout_bg_blur_intensity = bgBlurIntensityRange.value;
    currentSettings.bing_country = bingCountrySelect.value;
    
    // Get Grid Cols
    for (const radio of gridColsRadios) {
        if (radio.checked) {
            currentSettings.layout_grid_cols = radio.value;
            break;
        }
    }
    
    // Get Menu Layout
    for (const radio of menuLayoutRadios) {
        if (radio.checked) {
            currentSettings.layout_menu_layout = radio.value;
            break;
        }
    }
    
    currentSettings.layout_enable_frosted_glass = frostedGlassSwitch.checked;
    currentSettings.layout_frosted_glass_intensity = frostedGlassIntensityRange.value;

    saveSettings();
  });

  if (frostedGlassSwitch) {
      frostedGlassSwitch.addEventListener('change', () => {
          const intensityContainer = document.getElementById('frostedGlassIntensityContainer');
          if (frostedGlassSwitch.checked) {
              intensityContainer.classList.remove('opacity-50', 'pointer-events-none');
          } else {
              intensityContainer.classList.add('opacity-50', 'pointer-events-none');
          }
      });
  }

  if (frostedGlassIntensityRange) {
      frostedGlassIntensityRange.addEventListener('input', () => {
          if (frostedGlassIntensityValue) {
              frostedGlassIntensityValue.textContent = frostedGlassIntensityRange.value;
          }
      });
  }

  if (bgBlurSwitch) {
      bgBlurSwitch.addEventListener('change', () => {
          const container = document.getElementById('bgBlurIntensityContainer');
          if (bgBlurSwitch.checked) {
              container.classList.remove('opacity-50', 'pointer-events-none');
          } else {
              container.classList.add('opacity-50', 'pointer-events-none');
          }
      });
  }

  if (bgBlurIntensityRange) {
      bgBlurIntensityRange.addEventListener('input', () => {
          if (bgBlurIntensityValue) {
              bgBlurIntensityValue.textContent = bgBlurIntensityRange.value;
          }
      });
  }

  batchCompleteBtn.addEventListener('click', handleBulkGenerate);
  stopBulkBtn.addEventListener('click', () => {
    shouldStopBulkGeneration = true;
    showMessage('正在停止...', 'info');
  });

  // --- Helper Functions ---

  async function loadSettings() {
    try {
        // 1. Try to fetch from server (new source of truth)
        const res = await fetch('/api/settings');
        const data = await res.json();
        
        if (data.code === 200 && data.data) {
            const serverSettings = data.data;
            
            // Map known keys
            if (serverSettings.provider) currentSettings.provider = serverSettings.provider;
            if (serverSettings.apiKey) currentSettings.apiKey = serverSettings.apiKey;
            if (serverSettings.baseUrl) currentSettings.baseUrl = serverSettings.baseUrl;
            if (serverSettings.model) currentSettings.model = serverSettings.model;
            
            if (serverSettings.layout_hide_desc !== undefined) currentSettings.layout_hide_desc = serverSettings.layout_hide_desc === 'true';
            if (serverSettings.layout_hide_links !== undefined) currentSettings.layout_hide_links = serverSettings.layout_hide_links === 'true';
            if (serverSettings.layout_hide_category !== undefined) currentSettings.layout_hide_category = serverSettings.layout_hide_category === 'true';
            if (serverSettings.layout_hide_title !== undefined) currentSettings.layout_hide_title = serverSettings.layout_hide_title === 'true';
            if (serverSettings.layout_hide_subtitle !== undefined) currentSettings.layout_hide_subtitle = serverSettings.layout_hide_subtitle === 'true';
            if (serverSettings.layout_enable_frosted_glass !== undefined) currentSettings.layout_enable_frosted_glass = serverSettings.layout_enable_frosted_glass === 'true';
            if (serverSettings.layout_frosted_glass_intensity) currentSettings.layout_frosted_glass_intensity = serverSettings.layout_frosted_glass_intensity;
            if (serverSettings.layout_grid_cols) currentSettings.layout_grid_cols = serverSettings.layout_grid_cols;
            if (serverSettings.layout_custom_wallpaper) currentSettings.layout_custom_wallpaper = serverSettings.layout_custom_wallpaper;
            if (serverSettings.layout_menu_layout) currentSettings.layout_menu_layout = serverSettings.layout_menu_layout;
            if (serverSettings.layout_random_wallpaper !== undefined) currentSettings.layout_random_wallpaper = serverSettings.layout_random_wallpaper === 'true';
            if (serverSettings.layout_enable_bg_blur !== undefined) currentSettings.layout_enable_bg_blur = serverSettings.layout_enable_bg_blur === 'true';
            if (serverSettings.layout_bg_blur_intensity) currentSettings.layout_bg_blur_intensity = serverSettings.layout_bg_blur_intensity;
            if (serverSettings.bing_country !== undefined) currentSettings.bing_country = serverSettings.bing_country;

        } else {
            // Fallback to localStorage if server has no data (migration)
            const localConfig = localStorage.getItem('ai_settings');
            if (localConfig) {
                const parsed = JSON.parse(localConfig);
                currentSettings = { ...currentSettings, ...parsed };
            }
        }
    } catch (e) {
        console.error('Failed to load settings', e);
        // Fallback to localStorage
        const localConfig = localStorage.getItem('ai_settings');
        if (localConfig) {
            const parsed = JSON.parse(localConfig);
            currentSettings = { ...currentSettings, ...parsed };
        }
    }

    updateUIFromSettings();
  }

  async function saveSettings() {
    // Save to localStorage (backup/legacy)
    localStorage.setItem('ai_settings', JSON.stringify({
        provider: currentSettings.provider,
        apiKey: currentSettings.apiKey,
        baseUrl: currentSettings.baseUrl,
        model: currentSettings.model
    }));

    // Save to Server
    try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>⏳</span> 保存中...';
        
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentSettings)
        });
        const data = await res.json();
        
        if (data.code === 200) {
            showMessage('设置已保存', 'success');
            closeModal();
        } else {
            showMessage('保存失败: ' + data.message, 'error');
        }
    } catch (e) {
        showMessage('保存失败 (网络错误)', 'error');
        console.error(e);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span>💾</span> 保存设置';
    }
  }

  function updateUIFromSettings() {
    // AI UI
    if (providerSelector) {
      providerSelector.value = currentSettings.provider || 'workers-ai';
    }
    const provider = currentSettings.provider || 'workers-ai';
    apiKeyInput.value = currentSettings.apiKey || '';
    baseUrlInput.value = currentSettings.baseUrl || '';
    
    // Legacy fix
    if (!['gemini', 'openai', 'workers-ai'].includes(provider)) {
        currentSettings.provider = 'workers-ai';
        providerSelector.value = 'workers-ai';
    }

    if (provider === 'workers-ai') {
      apiKeyInput.parentElement.style.display = 'none';
      baseUrlGroup.style.display = 'none';
      modelNameInput.parentElement.style.display = 'none'; 
    } else {
      apiKeyInput.parentElement.style.display = 'block';
      modelNameInput.parentElement.style.display = 'block';

      if (provider === 'gemini') {
        modelNameInput.value = currentSettings.model || 'gemini-1.5-flash';
        modelNameInput.placeholder = 'gemini-1.5-flash';
        baseUrlGroup.style.display = 'none';
      } else if (provider === 'openai') {
        modelNameInput.value = currentSettings.model || 'gpt-3.5-turbo';
        modelNameInput.placeholder = 'gpt-3.5-turbo';
        baseUrlGroup.style.display = 'block';
      }
    }

    // Layout UI
    if (hideDescSwitch) hideDescSwitch.checked = !!currentSettings.layout_hide_desc;
    if (hideLinksSwitch) hideLinksSwitch.checked = !!currentSettings.layout_hide_links;
    if (hideCategorySwitch) hideCategorySwitch.checked = !!currentSettings.layout_hide_category;
    if (hideTitleSwitch) hideTitleSwitch.checked = !!currentSettings.layout_hide_title;
    if (hideSubtitleSwitch) hideSubtitleSwitch.checked = !!currentSettings.layout_hide_subtitle;
    if (frostedGlassSwitch) frostedGlassSwitch.checked = !!currentSettings.layout_enable_frosted_glass;
    if (frostedGlassIntensityRange) frostedGlassIntensityRange.value = currentSettings.layout_frosted_glass_intensity || '15';
    if (frostedGlassIntensityValue) frostedGlassIntensityValue.textContent = currentSettings.layout_frosted_glass_intensity || '15';
    
    // Toggle Intensity Container visibility
    const intensityContainer = document.getElementById('frostedGlassIntensityContainer');
    if (intensityContainer) {
        if (currentSettings.layout_enable_frosted_glass) {
            intensityContainer.classList.remove('opacity-50', 'pointer-events-none');
        } else {
            intensityContainer.classList.add('opacity-50', 'pointer-events-none');
        }
    }

    if (customWallpaperInput) customWallpaperInput.value = currentSettings.layout_custom_wallpaper || '';
    if (randomWallpaperSwitch) randomWallpaperSwitch.checked = !!currentSettings.layout_random_wallpaper;
    if (bgBlurSwitch) bgBlurSwitch.checked = !!currentSettings.layout_enable_bg_blur;
    if (bgBlurIntensityRange) bgBlurIntensityRange.value = currentSettings.layout_bg_blur_intensity || '0';
    if (bgBlurIntensityValue) bgBlurIntensityValue.textContent = currentSettings.layout_bg_blur_intensity || '0';
    
    const bgBlurContainer = document.getElementById('bgBlurIntensityContainer');
    if (bgBlurContainer) {
        if (currentSettings.layout_enable_bg_blur) {
            bgBlurContainer.classList.remove('opacity-50', 'pointer-events-none');
        } else {
            bgBlurContainer.classList.add('opacity-50', 'pointer-events-none');
        }
    }

    if (bingCountrySelect) bingCountrySelect.value = currentSettings.bing_country || '';
    
    // Grid Cols
    if (gridColsRadios) {
        for (const radio of gridColsRadios) {
            if (radio.value === String(currentSettings.layout_grid_cols)) {
                radio.checked = true;
            }
        }
    }
    
    // Menu Layout
    if (menuLayoutRadios) {
        for (const radio of menuLayoutRadios) {
            if (radio.value === String(currentSettings.layout_menu_layout)) {
                radio.checked = true;
            }
        }
    }
  }

  // --- AI Call Logic (Frontend) ---
  // Note: Pass currentSettings instead of trying to read from localStorage inside
  async function getAIDescription(aiConfig, bookmark, generateName = false) {
    const { provider, apiKey, baseUrl, model } = aiConfig;
    const { name, url } = bookmark;

    let systemPrompt, userPrompt;
    if (generateName) {
      systemPrompt = "You are a helpful assistant. You must response with valid JSON.";
      userPrompt = `分析链接：'${url}'。请生成一个简短的网站名称（name，不超过10字）和中文简介（description，不超过30字）。请严格只返回 JSON 格式，例如：{"name": "名称", "description": "简介"}。`;
    } else {
      systemPrompt = "You are a helpful assistant that generates concise and accurate descriptions for bookmarks.";
      userPrompt = `为以下书签生成一个简洁的中文描述（不超过30字）。请直接返回描述内容，不要包含"书签名称"、"描述"等前缀，也不要使用"标题: 描述"的格式。书签名称：'${name}'，链接：'${url}'`;
    }

    let responseText = '';

    try {
      if (provider === 'workers-ai') {
        const response = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ]
          })
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Workers AI error: ${errorText}`);
        }
        const data = await response.json();
        responseText = typeof data.data === 'string' ? data.data : (data.data.response || JSON.stringify(data.data));

      } else if (provider === 'gemini') {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.7 },
          }),
        });
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
        }
        const data = await response.json();
        responseText = data.candidates[0].content.parts[0].text.trim();
      } else if (provider === 'openai') {
        const openaiUrl = `${baseUrl}/v1/chat/completions`;
        const response = await fetch(openaiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,

          }),
        });
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
        }
        const data = await response.json();
        responseText = data.choices[0].message.content.trim();
      } else {
        throw new Error('Unsupported AI provider');
      }

      if (generateName) {
        try {
          const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(jsonStr);
        } catch (e) {
          console.warn('JSON parse failed, returning raw text as description', e);
          return { description: responseText, name: '' };
        }
      } else {
        return { description: responseText, name: '' };
      }

    } catch (error) {
      console.error('AI description generation failed:', error);
      throw error;
    }
  }

  // --- Bulk Generation Logic (Refactored) ---
  async function handleBulkGenerate() {
    currentSettings.apiKey = apiKeyInput.value.trim();
    currentSettings.baseUrl = baseUrlInput.value.trim();
    currentSettings.model = modelNameInput.value.trim();

    // Validation
    if (currentSettings.provider !== 'workers-ai') {
      if (!currentSettings.apiKey || !currentSettings.model) {
        showMessage('请先配置 API Key 和模型名称', 'error');
        return;
      }
      if (currentSettings.provider === 'openai' && !currentSettings.baseUrl) {
        showMessage('使用 OpenAI 兼容模式时，Base URL 是必填项', 'error');
        return;
      }
    }

    showMessage('正在扫描所有书签，请稍候...', 'info');
    let linksToUpdate = [];
    try {
      const response = await fetch('/api/get-empty-desc-sites');
      const result = await response.json();

      if (!response.ok || result.code !== 200) {
        showMessage(result.message || '获取待处理列表失败', 'error');
        return;
      }
      linksToUpdate = result.data;
    } catch (error) {
      showMessage('扫描书签时发生网络错误', 'error');
      return;
    }

    if (linksToUpdate.length === 0) {
      showMessage('太棒了！所有书签都已有描述。', 'success');
      return;
    }

    if (!confirm(`发现 ${linksToUpdate.length} 个链接缺少描述，确定要使用 AI 自动生成吗？`)) {
      return;
    }

    shouldStopBulkGeneration = false;
    bulkIdleView.style.display = 'none';
    bulkProgressView.style.display = 'block';

    let completedCount = 0;
    const total = linksToUpdate.length;
    progressCounter.textContent = `0 / ${total}`;
    progressBar.style.width = '0%';

    for (let i = 0; i < total; i++) {
      if (shouldStopBulkGeneration) {
        break;
      }

      const link = linksToUpdate[i];

      try {
        const { description } = await getAIDescription(currentSettings, link);
        const updateResponse = await fetch('/api/update-description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: link.id, url: link.url, logo: link.logo, description: description })
        });

        const result = await updateResponse.json();
        if (result.code === 200) {
          completedCount++;
        } else {
          console.error(`Failed to update description for ${link.name}:`, result.message);
        }
      } catch (error) {
        console.error(`Error processing ${link.name}:`, error);
      }

      progressCounter.textContent = `${i + 1} / ${total}`;
      progressBar.style.width = `${((i + 1) / total) * 100}%`;

      if (i < total - 1) {
        console.log('Waiting for next request...:', aiRequestDelay);
        await new Promise(resolve => setTimeout(resolve, aiRequestDelay));
      }
    }

    bulkIdleView.style.display = 'block';
    bulkProgressView.style.display = 'none';

    // 如果是手动停止，等待2秒以确保数据库写入最终一致性
    if (shouldStopBulkGeneration) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 如果有任何书签被更新（或操作被停止），则刷新列表
    if (completedCount > 0 || shouldStopBulkGeneration) {
      fetchConfigs(currentPage);
    }

    // 根据结果显示最终消息
    let message = '';
    let messageType = 'success';
    if (shouldStopBulkGeneration) {
      message = `操作已停止。成功更新 ${completedCount} 个书签。列表已刷新。`;
    } else {
      if (completedCount === total && total > 0) {
        message = `批量生成完成！成功更新了全部 ${total} 个书签。`;
      } else if (completedCount > 0) {
        message = `批量生成完成。成功更新 ${completedCount} / ${total} 个书签。`;
        messageType = 'info';
      } else if (total > 0) {
        message = '批量生成完成，但未能成功更新任何书签。请检查控制台日志。';
        messageType = 'error';
      }
    }
    if (message) {
      showMessage(message, messageType);
    }

    shouldStopBulkGeneration = false;
  }

  // --- Individual AI Generation (Add/Edit) ---
  const addBookmarkAiBtn = document.getElementById('addBookmarkAiBtn');
  const editBookmarkAiBtn = document.getElementById('editBookmarkAiBtn');

  async function handleSingleGenerate(nameInputId, urlInputId, descInputId, btnId, modalId) {
    const name = document.getElementById(nameInputId).value.trim();
    const url = document.getElementById(urlInputId).value.trim();
    const descInput = document.getElementById(descInputId);
    const btn = document.getElementById(btnId);

    if (!url) {
      showModalMessage(modalId, '请先填写 URL', 'error');
      return;
    }

    // Ensure config is loaded
    loadSettings();

    // Check if AI is configured (if not workers-ai, need key)
    if (currentSettings.provider !== 'workers-ai' && !currentSettings.apiKey) {
      showModalMessage(modalId, '请先在 AI 设置中配置 API Key', 'error');
      return;
    }

    // Loading State
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<div class="ai-spinner"></div>';
    btn.disabled = true;

    showModalMessage(modalId, '正在生成描述...', 'info');
    try {
      // Create a temporary object to match the expected structure
      const generateName = !name;
      const bookmark = { name: name || '未命名', url: url };
      const result = await getAIDescription(currentSettings, bookmark, generateName);

      descInput.value = result.description;
      if (generateName && result.name) {
        document.getElementById(nameInputId).value = result.name;
      }
      showModalMessage(modalId, '生成成功', 'success');
    } catch (error) {
      console.error(error);
      showModalMessage(modalId, '生成失败: ' + error.message, 'error');
    } finally {
      // Restore State
      btn.innerHTML = originalContent;
      btn.disabled = false;
    }
  }

  if (addBookmarkAiBtn) {
    addBookmarkAiBtn.addEventListener('click', () => {
      handleSingleGenerate('addBookmarkName', 'addBookmarkUrl', 'addBookmarkDesc', 'addBookmarkAiBtn', 'addBookmarkModal');
    });
  }

  if (editBookmarkAiBtn) {
    editBookmarkAiBtn.addEventListener('click', () => {
      handleSingleGenerate('editBookmarkName', 'editBookmarkUrl', 'editBookmarkDesc', 'editBookmarkAiBtn', 'editBookmarkModal');
    });
  }
});

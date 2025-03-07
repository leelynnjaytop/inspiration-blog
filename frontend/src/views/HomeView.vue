<template>
  <div class="home-container" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <!-- 左侧：我的灵感树 -->
    <aside class="sidebar" :class="{ collapsed: isSidebarCollapsed }">
      <div class="sidebar-header">
        <div class="header-title">
          <div class="title-wrapper">
            <!-- 树形图标 -->
            <div class="tree-icon">
              <el-icon><Connection /></el-icon>
            </div>
            <!-- 标题文字 -->
            <h2 class="text-title">我的灵感树</h2>
          </div>
          <span class="subtitle" v-if="!isSidebarCollapsed">
            {{ inspirationStore.inspirations.length }} 个灵感
          </span>
        </div>
        <el-button
          type="primary"
          class="create-btn"
          @click="showCreateDialog = true"
          v-if="!isSidebarCollapsed"
        >
          <el-icon><Plus /></el-icon>
          创建灵感
        </el-button>
      </div>

      <!-- 替换折叠按钮为突起设计 -->
      <div
        class="sidebar-tab"
        @click="toggleSidebar"
        :title="isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
      >
        <el-icon>
          <ArrowLeft v-if="!isSidebarCollapsed" />
          <ArrowRight v-else />
        </el-icon>
      </div>

      <div class="inspiration-list" v-if="!isSidebarCollapsed">
        <div
          v-for="note in inspirationStore.inspirations"
          :key="note.id"
          class="inspiration-item"
          :class="{ active: note.id === currentId }"
          @click="goToDetail(note.id)"
        >
          <div class="item-content">
            <div class="item-main">
              <h3 class="title" :title="note.title">{{ truncateTitle(note.title) }}</h3>
              <p class="preview">{{ truncateContent(note.content) }}</p>
            </div>
            <div class="item-meta">
              <span class="time">{{ formatTime(note.createdAt) }}</span>
              <el-tag v-if="!note.isPublic" size="small" type="info" effect="light">私密</el-tag>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- 右侧：发现灵感 -->
    <main class="main-content">
      <div class="content-wrapper">
        <header class="section-header">
          <h1>发现灵感</h1>
          <p class="subtitle">探索他人的思维火花，激发你的创意灵感</p>

          <!-- 添加搜索区域 -->
          <div class="search-section">
            <div class="search-box">
              <el-input
                v-model="searchQuery"
                placeholder="搜索标题或作者..."
                clearable
                :prefix-icon="Search"
                @input="handleSearch"
                class="search-input"
              />
            </div>

            <!-- 搜索结果统计 -->
            <div class="search-stats" v-if="searchQuery">
              找到 {{ filteredInspirations.length }} 条相关灵感
            </div>
          </div>
        </header>

        <!-- 使用过滤后的灵感列表 -->
        <inspiration-list
          :inspirations="filteredInspirations"
          :isSidebarCollapsed="isSidebarCollapsed"
        />
      </div>
    </main>

    <!-- 创建灵感树对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="创建灵感树"
      width="640px"
      :close-on-click-modal="false"
      class="create-dialog"
    >
      <div class="dialog-content">
        <el-form
          :model="createForm"
          :rules="rules"
          ref="createFormRef"
          label-position="top"
          class="create-form"
        >
          <el-form-item
            label="种子灵感"
            prop="title"
            class="form-item"
          >
            <div class="form-item-hint">这是你灵感树的核心节点，后续可以基于它延伸更多想法</div>
            <el-input
              v-model="createForm.title"
              type="text"
              placeholder="输入灵感树的核心想法"
              maxlength="15"
              show-word-limit
              size="large"
            />
          </el-form-item>

          <el-form-item
            label="描述（选填）"
            class="form-item"
          >
            <div class="form-item-hint">补充说明你的想法，让它更容易被理解</div>
            <el-input
              v-model="createForm.content"
              type="textarea"
              :rows="5"
              placeholder="补充说明你的想法..."
              maxlength="200"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="可见性" class="form-item">
            <div class="visibility-options">
              <div
                class="visibility-option"
                :class="{ active: createForm.isPublic }"
                @click="createForm.isPublic = true"
              >
                <div class="icon-wrapper">
                  <el-icon><View /></el-icon>
                </div>
                <div class="option-content">
                  <span class="option-title">公开</span>
                  <span class="option-desc">所有人可见</span>
                </div>
              </div>
              <div
                class="visibility-option"
                :class="{ active: !createForm.isPublic }"
                @click="createForm.isPublic = false"
              >
                <div class="icon-wrapper">
                  <el-icon><Lock /></el-icon>
                </div>
                <div class="option-content">
                  <span class="option-title">私密</span>
                  <span class="option-desc">仅自己可见</span>
                </div>
              </div>
            </div>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCreateDialog = false" size="large">取消</el-button>
          <el-button
            type="primary"
            :loading="creating"
            @click="handleCreate"
            size="large"
          >
            创建灵感树
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useInspirationStore } from "@/store/useInspirationStore";
import { useAuthStore } from "@/store/useAuthStore";
import type { FormInstance } from "element-plus";
import { ElMessage } from "element-plus";
import { Plus, Search, ArrowLeft, ArrowRight, Connection, View, Lock } from '@element-plus/icons-vue';
import InspirationList from "@/components/InspirationList.vue";

const router = useRouter();
const authStore = useAuthStore();
const inspirationStore = useInspirationStore();

// 在组件挂载时加载灵感列表数据
onMounted(async () => {
  await inspirationStore.getInspirations();
});
const createFormRef = ref<FormInstance>();
const showCreateDialog = ref(false);
const creating = ref(false);

const searchQuery = ref('');

const isSidebarCollapsed = ref(false);

// 初始化表单数据
const createForm = ref({
  title: "",
  content: "",
  isPublic: true
});

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入种子灵感', trigger: 'blur' },
    { min: 2, max: 15, message: '长度在 2 到 15 个字符', trigger: 'blur' }
  ]
};

// 创建新灵感
const handleCreate = async () => {
  if (!createFormRef.value) return;

  try {
    creating.value = true;
    await createFormRef.value.validate();

    console.log('准备创建灵感:', {
      title: createForm.value.title,
      content: createForm.value.content,
      isPublic: createForm.value.isPublic
    });

    const newId = await inspirationStore.createInspiration({
      title: createForm.value.title,
      content: createForm.value.content,
      isPublic: createForm.value.isPublic
    });

    console.log('创建成功，新灵感ID:', newId);
    showCreateDialog.value = false;
    createForm.value = { title: "", content: "", isPublic: true };
    ElMessage.success("灵感创建成功");
    // TODO: 跳转到新创建的灵感详情页，这里先刷新替代
    // router.push(`/inspiration/${newId}`);
    router.push('/');
  } catch (error) {
    console.error("创建失败，错误详情:", error);
    ElMessage.error("创建失败");
  } finally {
    creating.value = false;
  }
};

// 跳转到详情页
const goToDetail = (id: number) => {
  router.push(`/inspiration/${id}`);
};

// 添加标题截断函数
const truncateTitle = (title: string) => {
  if (!title) return '';
  return title.length > 10 ? title.substring(0, 10) + '...' : title;
};

// 添加内容截断函数
const truncateContent = (content: string) => {
  return content ? (content.length > 30 ? content.substring(0, 30) + '...' : content) : '暂无描述';
};

// 格式化时间
const formatTime = (time: string) => {
  return new Date(time).toLocaleDateString();
};

// 过滤灵感列表
const filteredInspirations = computed(() => {
  const query = searchQuery.value.trim();
  if (!query) return inspirationStore.recommendedInspirations;

  return inspirationStore.recommendedInspirations.filter(inspiration => {
    // 同时搜索标题和作者
    console.log(inspiration);
    return inspiration.title.includes(query) ||
           inspiration.author.username?.includes(query);
  });
});

// 处理搜索输入
const handleSearch = () => {
  // 这里可以添加搜索相关的逻辑
};

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};
</script>

<style scoped lang="scss">
.home-container {
  display: flex;
  min-height: 100vh;
  background-color: #fff;

  // 添加过渡效果
  .inspiration-grid {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  // 侧边栏收起时的样式
  &.sidebar-collapsed {
    .inspiration-grid {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
    }
  }
}

/* 左侧边栏 */
.sidebar {
  width: 360px;
  background: #fff;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  // 移除旧的折叠按钮样式
  .collapse-btn {
    display: none;
  }

  // 添加新的突起标签样式
  .sidebar-tab {
    position: absolute;
    right: -20px;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 70px;
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-left: none;
    border-radius: 0 8px 8px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #666;
    transition: all 0.3s ease;
    box-shadow: 4px 0 8px rgba(0, 0, 0, 0.03);

    &:hover {
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }

    .el-icon {
      font-size: 12px;
      transition: transform 0.3s ease;
    }
  }

  &.collapsed {
    width: 70px;

    .sidebar-tab {
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }
  }

  .sidebar-header {
    padding: 24px 20px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    position: sticky;
    top: 0;
    z-index: 10;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    .header-title {
      margin-bottom: 16px;

      .title-wrapper {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 4px;

        .tree-icon {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--el-color-primary);
          color: white;
          border-radius: 16px;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          margin-right: 8px;
          box-shadow: 0 4px 12px rgba(var(--el-color-primary-rgb), 0.2);
          transform: translateX(-5px);

          .el-icon {
            font-size: 28px;  // 增大图标尺寸
          }

          &:hover {
            transform: translateY(-2px) translateX(-5px);
            box-shadow: 0 6px 16px rgba(var(--el-color-primary-rgb), 0.3);
          }
        }

        .text-title {
          font-size: 18px;
          font-weight: 600;
          color: #1d1d1f;
          margin: 0;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          white-space: nowrap;
          overflow: hidden;
        }
      }

      .subtitle {
        font-size: 13px;
        color: #86868b;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
    }

    .create-btn {
      width: 100%;
      height: 40px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;

      .el-icon {
        margin-right: 4px;
        font-size: 16px;
        transition: margin 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      span {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
    }
  }
}

.inspiration-list {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;

    &:hover {
      background: rgba(0, 0, 0, 0.2);
    }
  }

  &.fade-enter-active,
  &.fade-leave-active {
    transition: opacity 0.3s ease;
  }

  &.fade-enter-from,
  &.fade-leave-to {
    opacity: 0;
  }
}

.inspiration-item {
  padding: 16px;
  margin-bottom: 8px;
  border-radius: 12px;
  background: #fff;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.04);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.08);
  }

  &.active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-5);
  }

  .item-content {
    .item-main {
      margin-bottom: 12px;

      .title {
        font-size: 15px;
        font-weight: 500;
        color: #1d1d1f;
        margin: 0 0 4px;
        line-height: 1.4;
      }

      .preview {
        font-size: 13px;
        color: #86868b;
        margin: 0;
        line-height: 1.5;
      }
    }

    .item-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .time {
        font-size: 12px;
        color: #999;
      }

      .el-tag {
        border: none;
        font-weight: 500;
      }
    }
  }
}

/* 主内容区 */
.main-content {
  flex: 1;
  padding: 64px 40px;
  background: #fff;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-left: 20px;
}

.content-wrapper {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}

.section-header {
  max-width: 600px;
  margin: 0 auto 64px;
  text-align: center;

  h1 {
    font-size: 48px;
    font-weight: 600;
    color: #1d1d1f;
    letter-spacing: -0.03em;
    margin: 0 0 16px;
    line-height: 1.1;
  }

  .subtitle {
    font-size: 24px;
    color: #6e6e73;
    letter-spacing: -0.02em;
    line-height: 1.4;
  }
}

.inspiration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;  // 减小间距以适应更多卡片
  max-width: 1200px;
  margin: 0 auto;
}

.inspiration-card {
  background: #fbfbfd;
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.06);
  }

  .card-content {
    padding: 32px;
    flex: 1;
    display: flex;
    align-items: center;

    h3 {
      font-size: 24px;
      font-weight: 600;
      color: #1d1d1f;
      letter-spacing: -0.02em;
      margin: 0;
      line-height: 1.3;
    }
  }

  .card-footer {
    padding: 24px 32px;
    background: rgba(0, 0, 0, 0.02);
    border-top: 1px solid rgba(0, 0, 0, 0.03);

    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .author-info {
      display: flex;
      align-items: center;
      gap: 12px;

      .author-avatar {
        border: 2px solid #fff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }

      .author-name {
        font-size: 15px;
        font-weight: 500;
        color: #1d1d1f;
        letter-spacing: -0.01em;
      }
    }

    .meta-info {
      display: flex;
      align-items: center;
      gap: 12px;

      .time {
        font-size: 14px;
        color: #86868b;
        letter-spacing: -0.01em;
      }
    }
  }
}

/* 创建灵感树对话框样式 */
.create-dialog {
  :deep(.el-dialog) {
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);

    .el-dialog__header {
      margin: 0;
      padding: 32px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);

      .el-dialog__title {
        font-size: 24px;
        font-weight: 600;
        color: #1d1d1f;
        letter-spacing: -0.01em;
      }
    }

    .el-dialog__body {
      padding: 32px;
    }

    .el-dialog__footer {
      padding: 24px 32px;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      background: #f9f9f9;
    }
  }

  .form-item {
    margin-bottom: 32px;

    :deep(.el-form-item__label) {
      padding-bottom: 12px;
      font-size: 16px;
      font-weight: 500;
      color: #1d1d1f;
    }

    .form-item-hint {
      font-size: 14px;
      color: #86868b;
      margin-bottom: 12px;
    }

    :deep(.el-input__wrapper) {
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
      padding: 4px 12px;
      transition: all 0.2s ease;

      &:hover {
        box-shadow: 0 0 0 1px var(--el-color-primary);
      }

      &.is-focus {
        box-shadow: 0 0 0 2px var(--el-color-primary-light-5);
      }
    }

    :deep(.el-textarea__inner) {
      padding: 12px;
      font-size: 15px;
      line-height: 1.6;
    }
  }

  .visibility-options {
    display: flex;
    gap: 24px;  // 增加间距

    .visibility-option {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;  // 减小内边距
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        border-color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
      }

      &.active {
        border-color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);

        .icon-wrapper {
          background: var(--el-color-primary);
          color: white;
          transform: scale(1.1);
        }
      }

      .icon-wrapper {
        width: 36px;  // 减小图标容器尺寸
        height: 36px;
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.04);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;

        .el-icon {
          font-size: 18px;  // 减小图标尺寸
        }
      }

      .option-content {
        display: flex;
        flex-direction: column;
        gap: 2px;  // 减小标题和描述的间距

        .option-title {
          font-size: 15px;  // 减小标题字号
          font-weight: 500;
          color: #1d1d1f;
        }

        .option-desc {
          font-size: 12px;  // 减小描述字号
          color: #86868b;
        }
      }
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 16px;

    .el-button {
      padding: 12px 24px;
      font-size: 15px;
      border-radius: 10px;
      min-width: 100px;
    }
  }
}

.search-section {
  max-width: 800px;
  margin: 32px auto 0;

  .search-box {
    :deep(.el-input) {
      --el-input-height: 48px;

      .el-input__wrapper {
        border-radius: 24px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
        transition: all 0.3s ease;
        padding: 0 20px;

        &:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        &.is-focus {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        .el-input__inner {
          font-size: 15px;

          &::placeholder {
            color: #999;
          }
        }

        .el-input__prefix {
          margin-right: 8px;

          .el-icon {
            font-size: 18px;
            color: #999;
          }
        }
      }
    }
  }

  .search-stats {
    margin-top: 16px;
    text-align: center;
    font-size: 14px;
    color: #666;
  }
}

// 调整灵感列表的上边距
.inspiration-list {
  margin-top: 48px;
}

:deep(.el-dropdown) {
  .el-dropdown-link {
    border: none !important;  // 移除边框
    padding: 0;  // 移除内边距
    box-shadow: none !important;  // 移除阴影
    background: transparent !important;  // 移除背景色

    &:hover {
      background: transparent !important;  // 悬浮时也保持透明背景
    }
  }
}

// 如果还需要保持用户信息的布局，可以添加以下样式
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  .username {
    font-size: 14px;
    color: #1d1d1f;
    font-weight: 500;
  }
}
</style>

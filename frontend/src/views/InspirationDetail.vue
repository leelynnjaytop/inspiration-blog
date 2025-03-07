<template>
  <div v-if="inspiration && inspiration.id" class="inspiration-detail">
    <!-- 左侧：灵感树区域 -->
    <div class="tree-section">
      <InspirationTree
        v-if="inspiration"
        :node="inspiration"
        @update="handleUpdate"
        @add="handleAdd"
        @delete="handleDelete"
      />
    </div>

    <!-- 右侧：互动区域 -->
    <div class="interaction-section">
      <!-- 创建者信息添加点击事件 -->
      <div class="creator-info" @click="goToUserProfile(inspiration?.author?.id)" role="button">
        <el-avatar
          :size="48"
          :src="inspiration?.author?.avatar"
          class="creator-avatar"
        />
        <div class="creator-meta">
          <span class="creator-name">{{ inspiration?.author?.name }}</span>
          <span class="create-time">{{ formatTime(inspiration?.createdAt) }}</span>
        </div>
      </div>

      <!-- 灵感描述区域 -->
      <div class="description-section">
        <h3>灵感描述</h3>
        <p class="description-content">{{ inspiration.content || '暂无描述' }}</p>
      </div>

      <!-- 互动按钮 -->
      <div class="interaction-buttons">
        <el-button
          type="primary"
          plain
          size="small"
          :class="{ active: isLiked }"
          @click="handleLike">
          <el-icon><Pointer /></el-icon>
          {{ inspiration.likes || 0 }}
        </el-button>
        <el-button
          type="primary"
          plain
          size="small"
          :class="{ active: isCollected }"
          @click="handleCollect">
          <el-icon><StarFilled /></el-icon>
          {{ inspiration.collections || 0 }}
        </el-button>
      </div>

      <!-- 评论区 -->
      <div class="comments-section">
        <h3>评论 ({{ comments?.length || 0 }})</h3>
        <div class="comment-input">
          <el-input
            v-model="newComment"
            type="textarea"
            :rows="3"
            placeholder="写下你的想法..."
          />
          <el-button
            type="primary"
            @click="handleAddComment"
            :loading="submitting"
            :disabled="!newComment.trim()">
            发表评论
          </el-button>
        </div>
        <div class="comments-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <div class="comment-header">
              <div class="user-info">
                <el-avatar
                  :size="32"
                  :src="comment.avatar || ''"
                  class="comment-avatar">
                  {{ comment.username.charAt(0) }}
                </el-avatar>
                <span class="username">{{ comment.username }}</span>
              </div>
              <div class="comment-actions">
                <span class="time">{{ formatTime(comment.createdAt) }}</span>
                <!-- 只有评论作者可以删除评论 -->
                <el-button
                  v-if="comment.userId === authStore.userInfo?.id"
                  type="text"
                  class="delete-btn"
                  @click="handleDeleteComment(comment.id)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
            <div class="comment-content">{{ comment.content }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="not-found">
    <el-empty description="找不到该灵感" />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { StarFilled, Pointer, Delete } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { useInspirationStore } from "@/store/useInspirationStore";
import { useInteractionStore } from "@/store/useInteractionStore";
import { useInspirationTreeStore } from "@/store/useInspirationTreeStore";
import InspirationTree from "@/components/InspirationTree.vue";
import type { InspirationNode } from "@/types/inspiration-tree";
import type { CreateNodeDto } from "@/types/inspiration-tree";
import { useAuthStore } from "@/store/useAuthStore";
import { useBrowseHistoryStore } from "@/store/useBrowseHistoryStore";

const route = useRoute();
const router = useRouter();
const inspirationStore = useInspirationStore();
const interactionStore = useInteractionStore();
const treeStore = useInspirationTreeStore();
const authStore = useAuthStore();
const browseHistoryStore = useBrowseHistoryStore();

const newComment = ref("");
const submitting = ref(false);

// 获取灵感 ID
const inspirationId = computed(() => Number(route.params.id));

// 获取灵感详情
const inspiration = ref<any>(null);

// 加载灵感详情数据
const loadInspirationData = async () => {
  if (!inspirationId.value) return;
  // try {
    const data = await inspirationStore.fetchInspiration(inspirationId.value);
    if (data) {
      inspiration.value = { ...data.data };
      console.log('获取灵感详情成功 inspiration.value:', inspiration.value);
      // TODO：更新store中的数据
      // const index = inspirationStore.inspirations.findIndex(note => note.id === inspirationId.value);
      // if (index === -1) {
      //   inspirationStore.inspirations.push({ ...data });
      // } else {
      //   inspirationStore.inspirations[index] = { ...data };
      // }
    } else {
      ElMessage.error('找不到灵感数据');
    }
  // } catch (error) {
  //   console.error('获取灵感详情失败:', error);
  //   ElMessage.error('获取灵感详情失败');
  // }
};

// 检查当前用户是否已点赞
const isLiked = computed(() => {
  return (
    interactionStore.currentUserInteraction?.likes.includes(
      Number(route.params.id)
    ) || false
  );
});

// 检查当前用户是否已收藏
const isCollected = computed(() => {
  return (
    interactionStore.currentUserInteraction?.collections.includes(
      Number(route.params.id)
    ) || false
  );
});

// 添加评论数据
const comments = computed(() => {
  const id = Number(route.params.id);
  return inspirationStore.getInspirationComments(id) || [];
});

// 处理点赞
const handleLike = () => {
  if (!inspiration.value) return;
  interactionStore.toggleLike(inspiration.value.id);
};

// 处理收藏
const handleCollect = () => {
  if (!inspiration.value) return;
  interactionStore.toggleCollection(inspiration.value.id);
};

// 添加删除评论的方法
const handleDeleteComment = async (commentId: number) => {
  try {
    await inspirationStore.deleteComment(commentId);
    // 使用 interactionStore 的删除方法
    interactionStore.deleteComment(commentId);
    ElMessage.success('评论已删除');
  } catch (error) {
    console.error('删除评论失败:', error);
    ElMessage.error('删除评论失败');
  }
};

// 修改添加评论的方法
const handleAddComment = async () => {
  if (!newComment.value.trim() || !inspiration.value) return;

  try {
    submitting.value = true;
    // 直接使用 interactionStore 的 addComment 方法
    await interactionStore.addComment(
      newComment.value,
      inspiration.value.id,
      inspiration.value.title
    );

    newComment.value = '';
    ElMessage.success('评论发表成功');
  } catch (error) {
    console.error('发表评论失败:', error);
    ElMessage.error('发表评论失败');
  } finally {
    submitting.value = false;
  }
};

const formatTime = (time?: string) => {
  if (!time) return "";
  return new Date(time).toLocaleString();
};

// 初始化树节点数据
const initTreeData = async () => {
  if (!inspiration.value) {
    console.error('找不到灵感数据，无法初始化树');
    return;
  }

  console.log('初始化树数据', inspiration.value);

  // 如果没有现有的树节点数据，创建一个根节点
  if (!treeStore.hasTree(inspiration.value.id)) {
    console.log('创建根节点');
    const rootNode: InspirationNode = {
      id: inspiration.value.id,
      title: inspiration.value.title,
      parentId: null,
      content: inspiration.value.content,
      createdAt: inspiration.value.createdAt,
      updatedAt: inspiration.value.updatedAt,
      children: []
    };
    await treeStore.initTree(rootNode);
  }

  // 获取完整的树节点数据
  await treeStore.getTreeNodes(inspiration.value.id);
};

// 在组件挂载时获取数据并初始化树
onMounted(async () => {
  await loadInspirationData();
  if (inspiration.value) {
    await initTreeData();
  }
});

// 监听路由变化，重新初始化树数据
watch(() => route.params.id, () => {
  initTreeData();
});

// 处理添加节点
const handleAdd = async (data: CreateNodeDto) => {
  try {
    const newNode: InspirationNode = {
      id: Date.now(),
      title: data.title || '',
      parentId: data.parentId,
      content: data.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      children: []
    };

    await treeStore.addNode(data.parentId, newNode);
    ElMessage.success('添加成功');
  } catch (error) {
    console.error('添加节点失败:', error);
    ElMessage.error('添加失败');
  }
};

// 处理更新节点
const handleUpdate = async (data: {
  id: number;
  title?: string;
  content: string;
}) => {
  try {
    await treeStore.updateNode(data.id, {
      title: data.title,
      content: data.content,
      updatedAt: new Date().toISOString()
    });
    ElMessage.success('更新成功');
  } catch (error) {
    console.error('更新节点失败:', error);
    ElMessage.error('更新失败');
  }
};

// 处理删除节点
const handleDelete = async (id: number) => {
  try {
    await treeStore.deleteNode(id);
    ElMessage.success('删除成功');
  } catch (error) {
    console.error('删除节点失败:', error);
    ElMessage.error('删除失败');
  }
};

// 在 watch 或 onMounted 中添加浏览记录
watch(() => inspiration.value, (newInspiration) => {
  if (newInspiration) {
    browseHistoryStore.addHistory(newInspiration);
  }
}, { immediate: true });

// 修改跳转到用户主页的方法
const goToUserProfile = (userId?: number) => {
  if (!userId) return;

  // 如果是当前用户，跳转到个人主页
  if (userId === authStore.userInfo?.id) {
    router.push({
      name: 'profile',
      params: { id: userId },
      query: { tab: 'inspirations' }  // 默认显示灵感列表标签
    });
  } else {
    // 如果是其他用户，跳转到用户主页
    router.push(`/user/${userId}`);
  }
};
</script>

<style scoped lang="scss">
.inspiration-detail {
  display: flex;
  height: calc(100vh - 64px); // 减去顶部导航栏高度
  overflow: hidden; // 防止整个页面滚动
  padding: 40px;
}

.tree-section {
  flex: 1;
  overflow: hidden; // 防止溢出
  min-width: 0; // 允许flex item收缩
  padding: 24px;
}

.interaction-section {
  width: 380px;
  border-left: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;
  display: flex;
  flex-direction: column;
  height: 100%;

  .creator-info {
    padding: 24px 24px 0;
    display: flex;
    align-items: center;
    gap: 16px;
    cursor: pointer;  // 添加鼠标指针样式
    transition: all 0.2s ease;

    &:hover {
      opacity: 0.8;  // 添加悬浮效果
    }

    .creator-avatar {
      border: 2px solid #fff;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    }

    .creator-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .creator-name {
        font-size: 18px;
        font-weight: 600;
        color: #1d1d1f;
      }

      .create-time {
        font-size: 14px;
        color: #86868b;
      }
    }
  }

  .description-section {
    margin: 24px;
    background: #f8f9fa;
    border-radius: 8px;
    padding: 20px;

    h3 {
      font-size: 16px;
      font-weight: 600;
      color: #1d1d1f;
      margin: 0 0 12px;
    }

    .description-content {
      font-size: 14px;
      color: #6e6e73;
      line-height: 1.6;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }
}

.interaction-buttons {
  padding: 16px 24px;
  display: flex;
  gap: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);

  .el-button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 88px;
    padding: 8px 16px;
    font-size: 13px;

    .el-icon {
      font-size: 14px;
    }

    &.active {
      background: rgba(9, 105, 218, 0.1);
      border-color: rgb(9, 105, 218);
      color: rgb(9, 105, 218);
    }
  }
}

.comments-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow: hidden;

  h3 {
    margin: 0 0 20px;
    font-size: 18px;
    font-weight: 600;
    color: #1d1d1f;
  }

  .comment-input {
    margin-bottom: 24px;

    .el-button {
      margin-top: 12px;
      width: 100%;
    }
  }

  .comments-list {
    flex: 1;
    overflow-y: auto;
    padding-right: 12px;

    // 美化滚动条
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.02);
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 3px;

      &:hover {
        background: rgba(0, 0, 0, 0.2);
      }
    }
  }
}

.comments-list {
  .comment-item {
    padding: 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);

    &:last-child {
      border-bottom: none;
    }

    .comment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      .user-info {
        display: flex;
        align-items: center;
        gap: 8px;

        .comment-avatar {
          border: 1px solid rgba(0, 0, 0, 0.06);
        }

        .username {
          font-weight: 500;
          color: #1d1d1f;
        }
      }

      .comment-actions {
        display: flex;
        align-items: center;
        gap: 12px;

        .time {
          font-size: 13px;
          color: #86868b;
        }

        .delete-btn {
          padding: 4px;
          color: #999;

          &:hover {
            color: #f56c6c;
          }

          .el-icon {
            font-size: 14px;
          }
        }
      }
    }

    .comment-content {
      font-size: 14px;
      line-height: 1.6;
      color: #1d1d1f;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }
}

.not-found {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

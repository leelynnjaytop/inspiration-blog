import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Inspiration, Comment, ApiInspiration, CreateInspirationDto } from "@/types/inspiration";
import type { InspirationNode } from "@/types/tree";
import { useAuthStore } from "./useAuthStore";
import { useInspirationTreeStore } from "./useInspirationTreeStore";
import * as inspirationApi from "@/api/inspiration";
import * as commentApi from "@/api/comment";
import { ElMessage } from "element-plus";
import _ from "lodash";

export const useInspirationStore = defineStore("inspiration", () => {
  const authStore = useAuthStore();
  const treeStore = useInspirationTreeStore();
  const inspirations = ref<Inspiration[]>([]);
  const activeNoteId = ref<number | null>(null);
  const loading = ref(false);

  // 添加评论存储的初始数据
  const allComments = ref<Comment[]>([
    {
      id: 1,
      content: "这是一条测试评论",
      createdAt: new Date().toISOString(),
      userId: 1,
      username: "admin",
      inspirationId: 1,
      inspirationTitle: "Vue 3 + TypeScript 开发体验"
    },
    {
      id: 2,
      content: "Vue 3 确实很棒！",
      createdAt: new Date().toISOString(),
      userId: 2,
      username: "test",
      inspirationId: 1,
      inspirationTitle: "Vue 3 + TypeScript 开发体验"
    }
  ]);

  // 当前用户的灵感笔记（只在左侧列表显示）
  const myInspirations = computed(() => {
    if (!authStore.userInfo?.id) return [];
    return inspirations.value.filter(note => note && note.userId === authStore.userInfo.id);
  });
  // 所有公开的灵感笔记（包括自己的）
  const recommendedInspirations = computed(() =>
    inspirations.value.filter(note => note && note.isPublic === true)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );
  // 获取灵感列表
  const getInspirations = async () => {
    try {
      const res = await inspirationApi.getInspirations();
      // console.log('获取灵感列表成功:', res);
      const nodes= res.data
      // console.log('转换为树形结构:', nodes);
      const re2 = nodes.data
      console.log('获取灵感列表成功 re2 inspirations.value:', re2);
      // 正确访问分页数据中的items数组
      inspirations.value = _.map(re2, (item: Inspiration) => ({
        ...item,
        isLiked: false,
        isCollected: false
      }));
    } catch (error) {
      console.error('获取灵感列表失败:', error);
      ElMessage.error('获取灵感列表失败');
    }
  };

  // 创建灵感
  const createInspiration = async (data: Partial<Inspiration>) => {
    try {
      // 转换为 CreateInspirationDto
      const createDto: CreateInspirationDto = {
        title: data.title || '',  // 确保提供必需字段
        content: data.content || '',
        isPublic: data.isPublic ?? true
      };

      const res = await inspirationApi.createInspiration(createDto);
      console.log('创建灵感成功 store:', res);
      // 添加必要的字段
      const newInspiration = {
        ...res.data.data,
        isLiked: false,
        isCollected: false,
        likes: 0,
        collections: 0,
        comments: 0,
        userId: authStore.userInfo?.id,
        author: {
          id: authStore.userInfo?.id,
          name: authStore.userInfo?.username,
          avatar: authStore.userInfo?.avatar
        }
      };
      inspirations.value.unshift(newInspiration);
      ElMessage.success('创建成功');
      return newInspiration.id;
    } catch (error) {
      console.error('创建灵感失败:', error);
      ElMessage.error('创建失败');
      throw error;
    }
  };

  // 更新灵感
  const updateInspiration = async (id: number, data: Partial<Inspiration>) => {
    try {
      const res = await inspirationApi.updateInspiration(id, data);
      const index = inspirations.value.findIndex(item => item.id === id);
      if (index !== -1) {
        inspirations.value[index] = { ...inspirations.value[index], ...res.data };
      }
      ElMessage.success('更新成功');
    } catch (error) {
      ElMessage.error('更新失败');
      throw error;
    }
  };

  // 删除灵感
  const deleteInspiration = async (id: number) => {
    try {
      await inspirationApi.deleteInspiration(id);
      inspirations.value = inspirations.value.filter(item => item.id !== id);
      ElMessage.success('删除成功');
    } catch (error) {
      ElMessage.error('删除失败');
      throw error;
    }
  };
  // 获取单个灵感详情
  const fetchInspiration = async (id: number) => {
    try {
      const res = await inspirationApi.getInspirationById(id);
      console.log('获取灵感详情成功:', res);
      // TODO: 暴力判断正确
      if (res.data && res.data.code) {
        return res.data;
      } else {
        const errorMessage = res.data?.message || '获取灵感详情失败';
        console.error('获取灵感详情失败:', errorMessage);
        if (res.data?.code === 404) {
          ElMessage.error('灵感不存在或已被删除');
        } else if (res.data?.code === 403) {
          ElMessage.error('您没有权限查看该灵感');
        } else {
          ElMessage.error(errorMessage);
        }
        return null;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '获取灵感详情失败';
      console.error('获取灵感详情失败:', errorMessage);
      ElMessage.error(errorMessage);
      return null;
    }
  };
  // 点赞/取消点赞
  const toggleLike = async (id: number) => {
    try {
      await inspirationApi.toggleLike(id);
      const inspiration = inspirations.value.find(item => item.id === id);
      if (inspiration) {
        inspiration.isLiked = !inspiration.isLiked;
        inspiration.likes += inspiration.isLiked ? 1 : -1;
      }
    } catch (error) {
      ElMessage.error('操作失败');
      throw error;
    }
  };

  // 收藏/取消收藏
  const toggleCollection = async (id: number) => {
    try {
      await inspirationApi.toggleCollection(id);
      const inspiration = inspirations.value.find(item => item.id === id);
      if (inspiration) {
        inspiration.isCollected = !inspiration.isCollected;
        inspiration.collections += inspiration.isCollected ? 1 : -1;
      }
    } catch (error) {
      ElMessage.error('操作失败');
      throw error;
    }
  };

  // 添加评论
  const addComment = async (inspirationId: number, content: string) => {
    try {
      const res = await commentApi.createComment({ inspirationId, content });
      const inspiration = inspirations.value.find(item => item.id === inspirationId);
      if (inspiration) {
        inspiration.comments += 1;
      }
      ElMessage.success('评论成功');
      return res.data;
    } catch (error) {
      ElMessage.error('评论失败');
      throw error;
    }
  };

  // 删除评论
  const deleteComment = async (id: number, inspirationId: number) => {
    try {
      await commentApi.deleteComment(id);
      const inspiration = inspirations.value.find(item => item.id === inspirationId);
      if (inspiration) {
        inspiration.comments -= 1;
      }
      ElMessage.success('删除成功');
    } catch (error) {
      ElMessage.error('删除失败');
      throw error;
    }
  };

  // 设置当前选中的灵感
  const setActiveNoteId = (id: number) => {
    activeNoteId.value = id;
  };

  // 更新灵感的互动计数
  const updateInspirationStats = (inspirationId: number, type: 'likes' | 'collections' | 'comments', isAdd: boolean) => {
    const inspiration = inspirations.value.find(note => note.id === inspirationId);
    if (inspiration) {
      inspiration[type] = inspiration[type] + (isAdd ? 1 : -1);
    }
  };

  // 获取灵感的评论
  const getInspirationComments = (inspirationId: number) => {
    console.log('Getting comments for inspiration:', inspirationId);
    const comments = allComments.value.filter(comment => comment.inspirationId === inspirationId);
    console.log('Found comments:', comments);
    return comments;
  };

  // 获取用户的所有评论
  const getUserComments = (userId: number) => {
    return allComments.value.filter(comment => comment.userId === userId);
  };
  return {
    inspirations,
    activeNoteId,
    loading,
    allComments,
    myInspirations,
    recommendedInspirations,
    getInspirations,
    createInspiration,
    updateInspiration,
    deleteInspiration,
    toggleLike,
    toggleCollection,
    addComment,
    deleteComment,
    setActiveNoteId,
    updateInspirationStats,
    getInspirationComments,
    getUserComments,
    fetchInspiration
  };
}, {
  persist: true
});

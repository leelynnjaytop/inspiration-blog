import { defineStore } from "pinia";
import { ref } from "vue";
import type { InspirationNode } from "@/types/inspiration-tree";
import * as nodeApi from "@/api/node";
import { ElMessage } from "element-plus";

export const useInspirationTreeStore = defineStore("inspirationTree", () => {
  // 存储所有灵感树的数据
  const trees = ref<Record<number, InspirationNode[][]>>({});
  const loading = ref(false);

  // 检查是否已存在树
  const hasTree = (inspirationId: number): boolean => {
    return !!trees.value[inspirationId];
  };

  // 初始化树
  const initTree = (rootNode: InspirationNode) => {
    if (!trees.value[rootNode.id]) {
      trees.value[rootNode.id] = [[rootNode]];
    }
  };

  // 获取灵感树节点
  const getTreeNodes = async (inspirationId: number) => {
    loading.value = true;
    try {
      const res = await nodeApi.getInspirationNodes(inspirationId);
      trees.value[inspirationId] = organizeNodes(res.data.data);
    } catch (error) {
      ElMessage.error('获取灵感树失败');
    } finally {
      loading.value = false;
    }
  };

  // 添加节点
  const addNode = async (node: Partial<InspirationNode>) => {
    try {
      const res = await nodeApi.createNode(node);
      if (node.inspirationId) {
        await getTreeNodes(node.inspirationId);
      }
      ElMessage.success('添加成功');
      return res.data;
    } catch (error) {
      ElMessage.error('添加失败');
      throw error;
    }
  };

  // 更新节点
  const updateNode = async (id: number, data: Partial<InspirationNode>) => {
    try {
      const res = await nodeApi.updateNode(id, data);
      if (data.inspirationId) {
        await getTreeNodes(data.inspirationId);
      }
      ElMessage.success('更新成功');
      return res.data;
    } catch (error) {
      ElMessage.error('更新失败');
      throw error;
    }
  };

  // 删除节点
  const deleteNode = async (id: number, inspirationId: number) => {
    try {
      await nodeApi.deleteNode(id);
      await getTreeNodes(inspirationId);
      ElMessage.success('删除成功');
    } catch (error) {
      ElMessage.error('删除失败');
      throw error;
    }
  };

  // 删除整棵树
  const deleteTree = (inspirationId: number) => {
    delete trees.value[inspirationId];
  };

  // 组织节点树结构
  const organizeNodes = (nodes: InspirationNode[]): InspirationNode[][] => {
    const result: InspirationNode[][] = [];
    const nodeMap = new Map<number | null, InspirationNode[]>();

    // 按照 parentId 分组
    nodes.forEach(node => {
      const parentId = node.parentId;
      if (!nodeMap.has(parentId)) {
        nodeMap.set(parentId, []);
      }
      nodeMap.get(parentId)?.push(node);
    });

    // 从根节点开始构建层级
    let currentParentId: number | null = null;
    while (nodeMap.has(currentParentId)) {
      const currentLevel = nodeMap.get(currentParentId) || [];
      result.push(currentLevel);
      // 获取下一层的第一个节点的 id 作为新的 parentId
      currentParentId = currentLevel[0]?.id || null;
    }

    return result;
  };

  return {
    trees,
    loading,
    hasTree,
    initTree,
    getTreeNodes,
    addNode,
    updateNode,
    deleteNode,
    deleteTree,
  };
}, {
  persist: true // 启用持久化
});

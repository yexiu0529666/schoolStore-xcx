// pages/merchant/categories/categories.js
const app = getApp();
const { merchantApi, productApi } = require('../../../utils/api');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: true,
    categories: [],
    filteredCategories: [],
    keyword: '',
    showAddModal: false,
    showEditModal: false,
    currentCategory: null,
    newCategory: {
      name: '',
      description: '',
      parent_id: null,
      sort_order: 0,
      image_url: ''
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查是否有商家权限
    this.checkMerchantAuth();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadCategories();
  },

  /**
   * 检查商家权限
   */
  checkMerchantAuth() {
    if (!app.globalData.isAdmin && !app.globalData.isMerchant) {
      wx.showModal({
        title: '提示',
        content: '您没有商家权限，请先登录商家账号',
        showCancel: false,
        success: () => {
          wx.navigateTo({
            url: '/pages/login/login'
          });
        }
      });
    }
  },

  /**
   * 加载商品分类
   */
  loadCategories() {
    this.setData({ loading: true });
    
    productApi.getCategories()
      .then(res => {
        if (res.success) {
          const categories = res.data;
          this.setData({
            categories: categories,
            filteredCategories: categories,
            loading: false
          });
        } else {
          wx.showToast({
            title: res.message || '获取分类失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      })
      .catch(err => {
        console.error('获取商品分类失败', err);
        wx.showToast({
          title: '获取商品分类失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      });
  },

  /**
   * 搜索分类
   */
  searchCategories(e) {
    const keyword = e.detail.value;
    let filteredCategories = this.data.categories;
    
    if (keyword) {
      filteredCategories = this.data.categories.filter(item => 
        item.name.toLowerCase().indexOf(keyword.toLowerCase()) >= 0
      );
    }
    
    this.setData({ 
      keyword,
      filteredCategories
    });
  },

  /**
   * 清除搜索关键词
   */
  clearKeyword() {
    if (this.data.keyword) {
      this.setData({ 
        keyword: '',
        filteredCategories: this.data.categories
      });
    }
  },

  /**
   * 显示添加分类模态框
   */
  showAddModal() {
    this.setData({
      showAddModal: true,
      newCategory: {
        name: '',
        description: '',
        parent_id: null,
        sort_order: 0,
        image_url: ''
      }
    });
  },

  /**
   * 关闭添加分类模态框
   */
  closeAddModal() {
    this.setData({ showAddModal: false });
  },

  /**
   * 处理分类数据输入
   */
  handleCategoryInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    this.setData({
      [`newCategory.${field}`]: value
    });
  },

  /**
   * 选择分类图片
   */
  chooseCategoryImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        // 显示本地预览
        this.setData({
          'newCategory.image_url': tempFilePath
        });
        
        // 上传图片到服务器
        wx.showLoading({
          title: '上传中...',
        });
        
        this.uploadFile(tempFilePath, 'category')
          .then(imageUrl => {
            wx.hideLoading();
            // 更新为服务器返回的URL
            this.setData({
              'newCategory.image_url': imageUrl
            });
            
            wx.showToast({
              title: '上传成功',
              icon: 'success'
            });
          })
          .catch(err => {
            wx.hideLoading();
            console.error('上传失败:', err);
            wx.showToast({
              title: '图片上传失败',
              icon: 'none'
            });
        });
      }
    });
  },

  /**
   * 删除图片
   */
  deleteImage() {
    this.setData({
      'newCategory.image_url': ''
    });
  },

  /**
   * 提交添加分类
   */
  submitAddCategory() {
    const { newCategory } = this.data;
    
    // 表单验证
    if (!newCategory.name) {
      wx.showToast({
        title: '请输入分类名称',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({ title: '保存中...' });
    
    // 检查图片是否已上传完成，如果是临时文件路径则上传
    const uploadPromise = newCategory.image_url && newCategory.image_url.startsWith('wxfile://') ?
      this.uploadFile(newCategory.image_url, 'category') :
      Promise.resolve(newCategory.image_url);
    
    uploadPromise
      .then(imageUrl => {
        // 构建请求数据
        const categoryData = {
          name: newCategory.name,
          description: newCategory.description || '',
          parent_id: newCategory.parent_id,
          sort_order: parseInt(newCategory.sort_order) || 0,
          image_url: imageUrl
        };
        
        // 添加分类
        return merchantApi.addCategory(categoryData);
      })
      .then(res => {
        wx.hideLoading();
        
        if (res.success) {
          wx.showToast({
            title: '分类添加成功',
            icon: 'success'
          });
          
          // 关闭模态框并刷新列表
          this.setData({ showAddModal: false });
          this.loadCategories();
        } else {
          wx.showToast({
            title: res.message || '分类添加失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('分类添加失败', err);
        wx.showToast({
          title: '分类添加失败',
          icon: 'none'
        });
      });
  },

  /**
   * 显示编辑分类模态框
   */
  showEditModal(e) {
    const index = e.currentTarget.dataset.index;
    const category = this.data.filteredCategories[index];
    const originalIndex = this.data.categories.findIndex(item => item.id === category.id);
    
    this.setData({
      showEditModal: true,
      currentCategory: originalIndex,
      newCategory: {
        name: category.name,
        description: category.description || '',
        parent_id: category.parent_id,
        sort_order: category.sort_order || 0,
        image_url: category.image_url || ''
      }
    });
  },

  /**
   * 关闭编辑分类模态框
   */
  closeEditModal() {
    this.setData({ showEditModal: false });
  },

  /**
   * 提交编辑分类
   */
  submitEditCategory() {
    const { newCategory, currentCategory } = this.data;
    const categoryId = this.data.categories[currentCategory].id;
    
    // 表单验证
    if (!newCategory.name) {
      wx.showToast({
        title: '请输入分类名称',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({ title: '保存中...' });
    
    // 检查图片是否已上传完成，如果是临时文件路径则上传
    const uploadPromise = newCategory.image_url && newCategory.image_url.startsWith('wxfile://') ?
      this.uploadFile(newCategory.image_url, 'category') :
      Promise.resolve(newCategory.image_url);
    
    uploadPromise
      .then(imageUrl => {
        // 构建请求数据
        const categoryData = {
          id: categoryId,
          name: newCategory.name,
          description: newCategory.description || '',
          parent_id: newCategory.parent_id,
          sort_order: parseInt(newCategory.sort_order) || 0,
          image_url: imageUrl
        };
        
        // 更新分类
        return merchantApi.updateCategory(categoryData);
      })
      .then(res => {
        wx.hideLoading();
        
        if (res.success) {
          wx.showToast({
            title: '分类更新成功',
            icon: 'success'
          });
          
          // 关闭模态框并刷新列表
          this.setData({ showEditModal: false });
          this.loadCategories();
        } else {
          wx.showToast({
            title: res.message || '分类更新失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('分类更新失败', err);
        wx.showToast({
          title: '分类更新失败',
          icon: 'none'
        });
      });
  },

  /**
   * 删除分类
   */
  deleteCategory(e) {
    const index = e.currentTarget.dataset.index;
    const category = this.data.filteredCategories[index];
    
    wx.showModal({
      title: '提示',
      content: `确定删除分类"${category.name}"吗？删除后无法恢复！`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          
          merchantApi.deleteCategory(category.id)
            .then(res => {
              wx.hideLoading();
              
              if (res.success) {
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                });
                
                // 刷新列表
                this.loadCategories();
              } else {
                wx.showToast({
                  title: res.message || '删除失败',
                  icon: 'none'
                });
              }
            })
            .catch(err => {
              wx.hideLoading();
              console.error('删除分类失败', err);
              wx.showToast({
                title: '删除分类失败',
                icon: 'none'
              });
            });
        }
      }
    });
  },

  /**
   * 上传文件
   */
  uploadFile(filePath, type) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${app.globalData.apiBaseUrl}/api/upload/`,
        filePath: filePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        },
        formData: {
          'type': type
        },
        success: function(res) {
          try {
            const data = JSON.parse(res.data);
            console.log('上传响应:', data);
            
            if (data.success && data.data && data.data.url) {
              resolve(data.data.url);
            } else {
              reject(new Error(data.message || '上传失败'));
            }
          } catch (e) {
            console.error('解析上传响应失败:', e, res.data);
            reject(new Error('解析响应失败'));
          }
        },
        fail: function(err) {
          console.error('上传失败:', err);
          reject(new Error('上传失败'));
        }
      });
    });
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadCategories();
    wx.stopPullDownRefresh();
  }
}); 
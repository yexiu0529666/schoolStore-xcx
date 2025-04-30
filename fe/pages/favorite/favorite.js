const app = getApp();
const { userApi, productApi, cartApi } = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    favorites: [],
    loading: false,
    isEmpty: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadFavorites();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时重新加载收藏列表
    this.loadFavorites();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadFavorites();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 加载收藏列表
   */
  loadFavorites() {
    this.setData({ loading: true });
    
    userApi.getFavorites().then(res => {
      if (res.success) {
        this.setData({
          favorites: res.data || [],
          loading: false,
          isEmpty: !res.data || res.data.length === 0
        });
      } else {
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    }).catch(err => {
      console.error('[FAVORITE] 获取收藏列表失败', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
    });
  },

  /**
   * 取消收藏
   */
  removeFavorite(e) {
    const favoriteId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认取消',
      content: '确定要取消收藏该商品吗？',
      success: (res) => {
        if (res.confirm) {
          userApi.removeFavorite(favoriteId).then(res => {
            if (res.success) {
              wx.showToast({
                title: '已取消收藏',
                icon: 'success'
              });
              this.loadFavorites();
            } else {
              wx.showToast({
                title: res.message || '操作失败',
                icon: 'none'
              });
            }
          }).catch(err => {
            console.error('[FAVORITE] 取消收藏失败', err);
            wx.showToast({
              title: '网络错误，请重试',
              icon: 'none'
            });
          });
        }
      }
    });
  },

  /**
   * 跳转到商品详情
   */
  goToProductDetail(e) {
    const productId = e.currentTarget.dataset.productId;
    wx.navigateTo({
      url: `/pages/product/product?id=${productId}`
    });
  },

  /**
   * 跳转到首页
   */
  goToIndex() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 加入购物车
   */
  addToCart(e) {
    const productId = e.currentTarget.dataset.productId;
    
    const cartData = {
      product_id: productId,
      quantity: 1
    };
    
    wx.showLoading({ title: '添加中...' });
    
    cartApi.addToCart(cartData).then(res => {
      wx.hideLoading();
      if (res.success) {
        wx.showToast({
          title: '已加入购物车',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.message || '添加失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('[CART] 添加购物车失败', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  }
}) 
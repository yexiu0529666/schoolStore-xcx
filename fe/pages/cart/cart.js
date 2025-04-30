// pages/cart/cart.js
const app = getApp();
const { cartApi } = require('../../utils/api');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    cartList: [],
    selectAll: false,
    totalPrice: 0,
    selectedCount: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.getCartList();
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
    this.getCartList();
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
    this.getCartList();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 获取购物车列表
   */
  getCartList() {
    wx.showLoading({
      title: '加载中',
    });
    
    cartApi.getCartList().then(res => {
      wx.hideLoading();
      console.log('[CART] 购物车API返回数据:', res);
      
      if (res.success) {
        // 处理返回的购物车数据
        const cartData = res.data || {};
        
        // 确保items是数组 
        let cartItems = [];
        if (cartData.items && Array.isArray(cartData.items)) {
          cartItems = cartData.items;
        } else if (Array.isArray(cartData)) {
          // 如果后端直接返回数组
          cartItems = cartData;
        }
        
        if (cartItems.length === 0) {
          // 设置空的购物车
          this.setData({
            cartList: [],
            selectAll: false,
            totalPrice: 0,
            selectedCount: 0
          });
          return;
        }
        
        // 添加选中状态（如果后端已提供，则使用后端数据）
        const cartList = cartItems.map(item => {
          return {
            ...item,
            selected: item.selected === undefined ? false : item.selected
          };
        });
        
        // 检查是否全选
        const selectAll = cartList.length > 0 && cartList.every(item => item.selected);
        
        this.setData({
          cartList,
          selectAll
        });
        
        // 计算总价和选中数量
        this.calculateTotal();
        
        console.log('[CART] 购物车列表获取成功，数量：', cartList.length);
      } else {
        // 设置空的购物车
        this.setData({
          cartList: [],
          selectAll: false,
          totalPrice: 0,
          selectedCount: 0
        });
        
        console.error('[CART] 购物车列表获取失败', res.message);
        // 不显示错误提示，让页面显示空购物车状态
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('[CART] 获取购物车列表失败', err);
      
      // 设置空的购物车
      this.setData({
        cartList: [],
        selectAll: false,
        totalPrice: 0,
        selectedCount: 0
      });
      
      // 不显示错误提示，让页面显示空购物车状态
    });
  },

  /**
   * 选择/取消选择单个商品
   */
  toggleSelectItem(e) {
    const { id } = e.currentTarget.dataset;
    const { cartList } = this.data;
    
    const updatedCartList = cartList.map(item => {
      if (item.id === id) {
        return {
          ...item,
          selected: !item.selected
        };
      }
      return item;
    });
    
    // 判断是否全选
    const selectAll = updatedCartList.every(item => item.selected);
    
    this.setData({
      cartList: updatedCartList,
      selectAll
    });
    
    this.calculateTotal();
  },

  /**
   * 全选/取消全选
   */
  toggleSelectAll() {
    const { selectAll, cartList } = this.data;
    const newSelectAll = !selectAll;
    
    const updatedCartList = cartList.map(item => {
      return {
        ...item,
        selected: newSelectAll
      };
    });
    
    this.setData({
      selectAll: newSelectAll,
      cartList: updatedCartList
    });
    
    this.calculateTotal();
  },

  /**
   * 增加商品数量
   */
  increaseQuantity(e) {
    const { id } = e.currentTarget.dataset;
    const { cartList } = this.data;
    
    const targetItem = cartList.find(item => item.id === id);
    if (!targetItem) return;
    
    const quantity = targetItem.quantity + 1;
    
    cartApi.updateCartItem({ id, quantity }).then(res => {
      if (res.success) {
        const updatedCartList = cartList.map(item => {
          if (item.id === id) {
            return {
              ...item,
              quantity
            };
          }
          return item;
        });
        
        this.setData({
          cartList: updatedCartList
        });
        
        this.calculateTotal();
      }
    }).catch(err => {
      console.error('[CART] 更新购物车失败', err);
      wx.showToast({
        title: '更新购物车失败',
        icon: 'none'
      });
    });
  },

  /**
   * 减少商品数量
   */
  decreaseQuantity(e) {
    const { id } = e.currentTarget.dataset;
    const { cartList } = this.data;
    
    const targetItem = cartList.find(item => item.id === id);
    if (!targetItem || targetItem.quantity <= 1) return;
    
    const quantity = targetItem.quantity - 1;
    
    cartApi.updateCartItem({ id, quantity }).then(res => {
      if (res.success) {
        const updatedCartList = cartList.map(item => {
          if (item.id === id) {
            return {
              ...item,
              quantity
            };
          }
          return item;
        });
        
        this.setData({
          cartList: updatedCartList
        });
        
        this.calculateTotal();
      }
    }).catch(err => {
      console.error('[CART] 更新购物车失败', err);
      wx.showToast({
        title: '更新购物车失败',
        icon: 'none'
      });
    });
  },

  /**
   * 删除购物车商品
   */
  removeCartItem(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '提示',
      content: '确定要删除该商品吗？',
      success: (res) => {
        if (res.confirm) {
          cartApi.removeCartItem(id).then(res => {
            if (res.success) {
              wx.showToast({
                title: '删除成功',
              });
              this.getCartList();
            } else {
              wx.showToast({
                title: res.message || '删除失败',
                icon: 'none'
              });
            }
          }).catch(err => {
            console.error('[CART] 删除购物车商品失败', err);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          });
        }
      }
    });
  },

  /**
   * 计算总价和选中商品数
   */
  calculateTotal() {
    const { cartList } = this.data;
    let totalPrice = 0;
    let selectedCount = 0;
    
    cartList.forEach(item => {
      if (item.selected) {
        totalPrice += item.price * item.quantity;
        selectedCount += 1;
      }
    });
    
    this.setData({
      totalPrice: totalPrice.toFixed(2),
      selectedCount
    });
  },

  /**
   * 去结算
   */
  checkout() {
    const { cartList, selectedCount } = this.data;
    
    console.log('[CART] 结算按钮点击，选中商品数:', selectedCount);
    
    if (selectedCount === 0) {
      wx.showToast({
        title: '请先选择商品',
        icon: 'none'
      });
      return;
    }
    
    const selectedItems = cartList.filter(item => item.selected).map(item => item.id);
    console.log('[CART] 选中的商品ID:', selectedItems);
    
    // 构造URL参数
    const cartItemsParam = JSON.stringify(selectedItems);
    const url = '/pages/checkout/checkout?cart_item_ids=' + cartItemsParam;
    console.log('[CART] 跳转URL:', url);
    
    wx.navigateTo({
      url: url,
      fail: function(err) {
        console.error('[CART] 跳转到结算页面失败:', err);
        wx.showToast({
          title: '跳转结算页面失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 去购物
   */
  goShopping() {
    wx.switchTab({
      url: '/pages/index/index',
    });
  }
})
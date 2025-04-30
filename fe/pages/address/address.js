// pages/address/address.js
const app = getApp();
const { userApi } = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    addresses: [],
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadAddresses();
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
    this.loadAddresses();
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
    this.loadAddresses();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 加载地址列表
   */
  loadAddresses() {
    this.setData({ loading: true });
    
    userApi.getAddresses().then(res => {
      if (res.success) {
        this.setData({
          addresses: res.data || [],
          loading: false
        });
      } else {
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    }).catch(err => {
      console.error('[ADDRESS] 获取地址列表失败', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
    });
  },

  /**
   * 添加新地址
   */
  addAddress() {
    wx.navigateTo({
      url: '/pages/edit-address/edit-address'
    });
  },

  /**
   * 编辑地址
   */
  editAddress(e) {
    const addressId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/edit-address/edit-address?id=${addressId}`
    });
  },

  /**
   * 删除地址
   */
  deleteAddress(e) {
    const addressId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      success: (res) => {
        if (res.confirm) {
          userApi.deleteAddress(addressId).then(res => {
            if (res.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              this.loadAddresses();
            } else {
              wx.showToast({
                title: res.message || '删除失败',
                icon: 'none'
              });
            }
          }).catch(err => {
            console.error('[ADDRESS] 删除地址失败', err);
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
   * 设置默认地址
   */
  setDefaultAddress(e) {
    const addressId = e.currentTarget.dataset.id;
    
    userApi.setDefaultAddress(addressId).then(res => {
      if (res.success) {
        wx.showToast({
          title: '设置成功',
          icon: 'success'
        });
        this.loadAddresses();
      } else {
        wx.showToast({
          title: res.message || '设置失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('[ADDRESS] 设置默认地址失败', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  }
}) 
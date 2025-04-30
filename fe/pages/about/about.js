// pages/about/about.js
const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    appName: '校园迷你商城',
    version: '1.0.0',
    description: '校园迷你商城是一个面向校园师生的综合性电商平台，为用户提供便捷的购物体验和多样化的商品选择。',
    features: [
      '商品浏览与搜索',
      '商品详情查看',
      '购物车管理',
      '订单管理',
      '优惠券领取与使用',
      '收货地址管理',
      '收藏夹功能',
      '商家入驻与管理'
    ],
    contactInfo: {
      phone: '400-123-4567',
      email: 'support@example.com',
      address: '某某省某某市某某区某某街道123号'
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

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

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 复制文本到剪贴板
   */
  copyText(e) {
    const text = e.currentTarget.dataset.text;
    wx.setClipboardData({
      data: text,
      success() {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        });
      }
    });
  },
  
  /**
   * 拨打电话
   */
  makePhoneCall() {
    wx.makePhoneCall({
      phoneNumber: this.data.contactInfo.phone,
      fail() {
        wx.showToast({
          title: '拨号取消',
          icon: 'none'
        });
      }
    });
  }
}) 
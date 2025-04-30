const app = getApp();
const { userApi } = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    id: null,
    address: {
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      is_default: false
    },
    regionValue: [],
    isEdit: false,
    submitting: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id) {
      this.setData({
        id: options.id,
        isEdit: true
      });
      this.loadAddressDetail(options.id);
    }
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
   * 加载地址详情
   */
  loadAddressDetail(id) {
    wx.showLoading({ title: '加载中...' });
    
    userApi.getAddressDetail(id).then(res => {
      wx.hideLoading();
      if (res.success && res.data) {
        const address = res.data;
        this.setData({
          address,
          regionValue: [address.province, address.city, address.district]
        });
      } else {
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('[ADDRESS] 获取地址详情失败', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  },

  /**
   * 输入框内容变化
   */
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    
    this.setData({
      [`address.${field}`]: value
    });
  },

  /**
   * 地区选择器变化
   */
  bindRegionChange(e) {
    const regionValue = e.detail.value;
    this.setData({
      regionValue,
      'address.province': regionValue[0],
      'address.city': regionValue[1],
      'address.district': regionValue[2]
    });
  },

  /**
   * 设为默认地址开关变化
   */
  onSwitchChange(e) {
    this.setData({
      'address.is_default': e.detail.value
    });
  },

  /**
   * 保存地址
   */
  saveAddress() {
    // 表单验证
    const { name, phone, province, city, district, detail } = this.data.address;
    
    if (!name.trim()) {
      return wx.showToast({
        title: '请输入收货人姓名',
        icon: 'none'
      });
    }
    
    if (!phone.trim() || !/^1\d{10}$/.test(phone)) {
      return wx.showToast({
        title: '请输入正确的手机号码',
        icon: 'none'
      });
    }
    
    if (!province || !city || !district) {
      return wx.showToast({
        title: '请选择所在地区',
        icon: 'none'
      });
    }
    
    if (!detail.trim()) {
      return wx.showToast({
        title: '请输入详细地址',
        icon: 'none'
      });
    }
    
    this.setData({ submitting: true });
    
    const savePromise = this.data.isEdit
      ? userApi.updateAddress({ ...this.data.address, id: this.data.id })
      : userApi.addAddress(this.data.address);
    
    savePromise.then(res => {
      if (res.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: res.message || '保存失败',
          icon: 'none'
        });
        this.setData({ submitting: false });
      }
    }).catch(err => {
      console.error('[ADDRESS] 保存地址失败', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      this.setData({ submitting: false });
    });
  }
}) 
// pages/merchant/add-coupon/add-coupon.js
const app = getApp();
const { merchantApi } = require('../../../utils/api');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isEdit: false,
    isSubmitting: false,
    couponId: null,
    formData: {
      title: '',
      description: '',
      amount: '',
      min_spend: '0',
      start_date: '',
      end_date: '',
      quantity: '-1', // -1表示无限制
      category_id: '',
      is_active: true
    },
    startDate: '',
    endDate: '',
    categories: [],
    categoryIndex: -1,
    selectedCategoryName: '',
    rules: {
      title: [
        { required: true, message: '请输入优惠券标题' }
      ],
      amount: [
        { required: true, message: '请输入优惠券金额' },
        { min: 0.01, message: '金额必须大于0' }
      ],
      min_spend: [
        { min: 0, message: '最低消费不能为负数' }
      ],
      start_date: [
        { required: true, message: '请选择开始日期' }
      ],
      end_date: [
        { required: true, message: '请选择结束日期' }
      ]
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 初始化日期
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    this.setData({
      startDate: this.formatDate(now),
      endDate: this.formatDate(nextMonth),
      'formData.start_date': this.formatDateTime(now),
      'formData.end_date': this.formatDateTime(nextMonth)
    });
    
    // 加载商品分类
    this.loadCategories();
    
    // 编辑模式
    if (options.id) {
      this.setData({
        isEdit: true,
        couponId: options.id
      });
      
      wx.setNavigationBarTitle({
        title: '编辑优惠券'
      });
      
      this.loadCouponDetail(options.id);
    } else {
      wx.setNavigationBarTitle({
        title: '添加优惠券'
      });
    }
  },

  /**
   * 加载商品分类
   */
  loadCategories() {
    // 使用商品分类接口获取分类列表
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/product/categories`,
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.success) {
          const categories = res.data.data || [];
          
          // 如果已有选中的分类，找到对应索引
          let categoryIndex = -1;
          let selectedCategoryName = '';
          if (this.data.formData.category_id && categories.length > 0) {
            for (let i = 0; i < categories.length; i++) {
              if (categories[i].id === this.data.formData.category_id) {
                categoryIndex = i;
                selectedCategoryName = categories[i].name;
                break;
              }
            }
          }
          
          this.setData({
            categories: categories,
            categoryIndex: categoryIndex,
            selectedCategoryName: selectedCategoryName
          });
        }
      },
      fail: (err) => {
        console.error('[ADD_COUPON] 加载分类失败', err);
      }
    });
  },

  /**
   * 加载优惠券详情
   */
  loadCouponDetail(id) {
    wx.showLoading({
      title: '加载中',
      mask: true
    });
    
    // 使用优惠券详情API
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/merchant/coupon/list?id=${id}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data && res.data.success && res.data.data && res.data.data.list && res.data.data.list.length > 0) {
          const coupon = res.data.data.list[0];
          
          // 找到分类索引
          let categoryIndex = -1;
          let selectedCategoryName = '';
          if (coupon.category_id && this.data.categories.length > 0) {
            for (let i = 0; i < this.data.categories.length; i++) {
              if (this.data.categories[i].id === coupon.category_id) {
                categoryIndex = i;
                selectedCategoryName = this.data.categories[i].name;
                break;
              }
            }
          }
          
          this.setData({
            'formData.title': coupon.title,
            'formData.description': coupon.description || '',
            'formData.amount': coupon.amount.toString(),
            'formData.min_spend': coupon.min_spend.toString(),
            'formData.start_date': coupon.start_date,
            'formData.end_date': coupon.end_date,
            'formData.quantity': coupon.quantity.toString(),
            'formData.category_id': coupon.category_id || '',
            'formData.is_active': coupon.is_active,
            startDate: coupon.start_date.split(' ')[0],
            endDate: coupon.end_date.split(' ')[0],
            categoryIndex: categoryIndex,
            selectedCategoryName: selectedCategoryName
          });
        } else {
          wx.showToast({
            title: '优惠券不存在',
            icon: 'none'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('[ADD_COUPON] 加载优惠券详情失败', err);
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    });
  },

  /**
   * 表单项变化
   */
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`formData.${field}`]: value
    });
  },

  /**
   * 选择日期
   */
  onDateChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    if (field === 'start_date') {
      this.setData({
        startDate: value,
        'formData.start_date': `${value} 00:00:00`
      });
    } else if (field === 'end_date') {
      this.setData({
        endDate: value,
        'formData.end_date': `${value} 23:59:59`
      });
    }
  },

  /**
   * 切换状态
   */
  toggleStatus() {
    this.setData({
      'formData.is_active': !this.data.formData.is_active
    });
  },

  /**
   * 验证表单
   */
  validateForm() {
    const { formData, rules } = this.data;
    
    for (const field in rules) {
      const value = formData[field];
      const fieldRules = rules[field];
      
      for (const rule of fieldRules) {
        if (rule.required && !value) {
          wx.showToast({
            title: rule.message,
            icon: 'none'
          });
          return false;
        }
        
        if (rule.min !== undefined && parseFloat(value) < rule.min) {
          wx.showToast({
            title: rule.message,
            icon: 'none'
          });
          return false;
        }
      }
    }
    
    // 验证开始时间和结束时间
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    
    if (startDate >= endDate) {
      wx.showToast({
        title: '结束时间必须晚于开始时间',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  /**
   * 提交表单
   */
  submitForm() {
    if (this.data.isSubmitting) return;
    
    if (!this.validateForm()) return;
    
    this.setData({ isSubmitting: true });
    
    wx.showLoading({
      title: this.data.isEdit ? '更新中' : '创建中',
      mask: true
    });
    
    const formData = {...this.data.formData};
    
    // 转换数值类型
    formData.amount = parseFloat(formData.amount);
    formData.min_spend = parseFloat(formData.min_spend);
    formData.quantity = parseInt(formData.quantity);
    
    const url = this.data.isEdit ? 
      `${app.globalData.apiBaseUrl}/api/merchant/coupon/update` : 
      `${app.globalData.apiBaseUrl}/api/merchant/coupon/create`;
    
    // 添加ID到更新请求
    if (this.data.isEdit) {
      formData.id = this.data.couponId;
    }
    
    wx.request({
      url: url,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      data: formData,
      success: (res) => {
        wx.hideLoading();
        if (res.data && res.data.success) {
          wx.showToast({
            title: this.data.isEdit ? '更新成功' : '创建成功',
            icon: 'success'
          });
          
          // 标记需要刷新优惠券列表
          app.globalData.couponRefresh = true;
          
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: res.data?.message || (this.data.isEdit ? '更新失败' : '创建失败'),
            icon: 'none'
          });
          this.setData({ isSubmitting: false });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error(`[ADD_COUPON] ${this.data.isEdit ? '更新' : '创建'}优惠券失败`, err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
        this.setData({ isSubmitting: false });
      }
    });
  },
  
  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  
  /**
   * 格式化日期时间
   */
  formatDateTime(date) {
    const dateStr = this.formatDate(date);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}:${seconds}`;
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
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 返回上一页
   */
  onBack() {
    wx.navigateBack();
  },

  /**
   * 选择分类
   */
  onCategoryChange(e) {
    const index = parseInt(e.detail.value);
    const category = this.data.categories[index];
    
    if (category) {
      this.setData({
        'formData.category_id': category.id,
        categoryIndex: index,
        selectedCategoryName: category.name
      });
    } else {
      this.setData({
        'formData.category_id': '',
        categoryIndex: -1,
        selectedCategoryName: ''
      });
    }
  }
})
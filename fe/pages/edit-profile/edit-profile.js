const app = getApp();
const { userApi } = require('../../utils/api');

Page({
  data: {
    userInfo: null,
    nickname: '',
    gender: '男', // 默认性别
    avatar: '',
    isUploading: false
  },

  onLoad(options) {
    // 获取用户信息
    this.setData({
      userInfo: app.globalData.userInfo || null
    });

    if (this.data.userInfo) {
      this.setData({
        nickname: this.data.userInfo.nickname || '',
        gender: this.data.userInfo.gender || '男',
        avatar: this.data.userInfo.avatar || '/static/images/default-avatar.svg'
      });
    }
  },

  // 输入昵称
  inputNickname(e) {
    this.setData({
      nickname: e.detail.value
    });
  },

  // 选择性别
  selectGender(e) {
    this.setData({
      gender: e.detail.value
    });
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 预览效果
        const tempFilePath = res.tempFilePaths[0];
        this.setData({
          avatar: tempFilePath
        });
        
        // 实际上传头像
        wx.showLoading({
          title: '上传中...',
        });
        
        this.setData({ isUploading: true });
        
        // 调用后端上传接口
        const app = getApp();
        
        wx.uploadFile({
          url: `${app.globalData.apiBaseUrl}/api/upload/`,  // 使用全局配置的API基础URL
          filePath: tempFilePath,
          name: 'file',
          header: {
            'Authorization': `Bearer ${wx.getStorageSync('token')}`
          },
          formData: {
            'type': 'avatar'  // 指定为头像类型
          },
          success: (res) => {
            try {
              const data = JSON.parse(res.data);
              console.log('上传响应:', data);
              
              if (data.success && data.data && data.data.url) {
                // 更新头像URL
                this.setData({
                  userInfo: {
                    ...this.data.userInfo,
                    avatar: data.data.url
                  },
                  avatar: data.data.url // 保存服务器返回的URL到data.avatar
                });
                
                wx.showToast({
                  title: '上传成功',
                  icon: 'success'
                });
              } else {
                wx.showToast({
                  title: data.message || '上传失败',
                  icon: 'none'
                });
              }
            } catch (e) {
              console.error('解析上传响应失败:', e, res.data);
              wx.showToast({
                title: '上传失败',
                icon: 'none'
              });
            }
          },
          fail: (err) => {
            console.error('上传失败:', err);
            wx.showToast({
              title: '上传失败，请检查网络',
              icon: 'none'
            });
          },
          complete: () => {
            wx.hideLoading();
            this.setData({ isUploading: false });
          }
        });
      }
    });
  },

  // 保存资料
  saveProfile() {
    if (!this.data.nickname) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }
    
    if (this.data.isUploading) {
      wx.showToast({
        title: '头像上传中，请稍候',
        icon: 'none'
      });
      return;
    }
    
    const updateData = {
      nickname: this.data.nickname,
      gender: this.data.gender,
      avatar: this.data.avatar
    };
    
    wx.showLoading({
      title: '保存中...',
    });
    
    userApi.updateUserInfo(updateData)
      .then(res => {
        wx.hideLoading();
        if (res.success) {
          // 更新本地用户信息
          const userInfo = app.globalData.userInfo || {};
          Object.assign(userInfo, updateData);
          app.globalData.userInfo = userInfo;
          wx.setStorageSync('userInfo', userInfo);
          
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
          
          // 返回上一页
          setTimeout(() => {
            wx.navigateBack();
          }, 1000);
        } else {
          wx.showToast({
            title: res.message || '保存失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        wx.showToast({
          title: '保存失败，请稍后再试',
          icon: 'none'
        });
        console.error(err);
      });
  }
}) 
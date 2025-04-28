import os
from datetime import timedelta

class Config:
    """
    Flask应用配置
    """
    # 基本配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'campus-mini-mall-secret-key'
    DEBUG = os.environ.get('FLASK_DEBUG') or True
    
    # 数据库配置
    DB_USER = os.environ.get('DB_USER') or 'root'
    DB_PASSWORD = os.environ.get('DB_PASSWORD') or 'root'
    DB_HOST = os.environ.get('DB_HOST') or 'localhost'
    DB_PORT = os.environ.get('DB_PORT') or '3306'
    DB_NAME = os.environ.get('DB_NAME') or 'campus_mall'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT配置
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'campus-mini-mall-jwt-secret-key'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)
    
    # 文件上传配置
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
    # 七牛云存储配置
    QINIU_ACCESS_KEY = os.environ.get('QINIU_ACCESS_KEY')
    QINIU_SECRET_KEY = os.environ.get('QINIU_SECRET_KEY')
    QINIU_BUCKET_NAME = os.environ.get('QINIU_BUCKET_NAME')
    QINIU_DOMAIN = os.environ.get('QINIU_DOMAIN')
    
    # 微信小程序配置
    WECHAT_APP_ID = os.environ.get('WECHAT_APP_ID') or 'wxe9fa95094a339d0a'
    # 重要提示: 请从微信开发者平台获取真实的AppSecret，这是必需的
    WECHAT_APP_SECRET = os.environ.get('WECHAT_APP_SECRET') or '7b0f9fa15db8097af7d3e8f1c72eba7c'  # 替换为真实的AppSecret值
    
    # Redis配置
    REDIS_URL = os.environ.get('REDIS_URL') or 'redis://localhost:6379/0'
    
    # 验证码配置
    SMS_API_KEY = os.environ.get('SMS_API_KEY')
    SMS_API_SECRET = os.environ.get('SMS_API_SECRET')
    VERIFY_CODE_EXPIRE = 300  # 验证码有效期，单位秒

class DevelopmentConfig(Config):
    """
    开发环境配置
    """
    DEBUG = True
    DB_NAME = 'campus_mall_dev'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or f'mysql+pymysql://{Config.DB_USER}:{Config.DB_PASSWORD}@{Config.DB_HOST}:{Config.DB_PORT}/{DB_NAME}'

class TestingConfig(Config):
    """
    测试环境配置
    """
    TESTING = True
    DB_NAME = 'campus_mall_test'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or f'mysql+pymysql://{Config.DB_USER}:{Config.DB_PASSWORD}@{Config.DB_HOST}:{Config.DB_PORT}/{DB_NAME}'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)

class ProductionConfig(Config):
    """
    生产环境配置
    """
    DEBUG = False
    SECRET_KEY = os.environ.get('SECRET_KEY')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')

config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
} 
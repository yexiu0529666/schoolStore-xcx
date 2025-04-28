import random
import string
import time
import shortuuid
import re
import json
from functools import wraps
from datetime import datetime, timedelta
from flask import jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
import threading

# 使用内存字典存储验证码
verification_codes = {}
verification_codes_lock = threading.Lock()

def init_redis(app):
    """
    初始化 Redis 客户端 (不再使用)
    """
    pass

def clean_expired_codes():
    """
    清理过期的验证码
    """
    with verification_codes_lock:
        current_time = time.time()
        expired_keys = [k for k, v in verification_codes.items() if v['expire_time'] < current_time]
        for key in expired_keys:
            del verification_codes[key]

def success_response(data=None, message="操作成功"):
    """
    成功响应
    """
    response = {
        "success": True,
        "message": message
    }
    
    if data is not None:
        response["data"] = data
    
    return jsonify(response)

def error_response(message="操作失败", error_code=None, status_code=400):
    """
    错误响应
    """
    response = {
        "success": False,
        "message": message
    }
    
    if error_code:
        response["error"] = error_code
    
    return jsonify(response), status_code

def generate_order_no():
    """
    生成订单号
    """
    # 格式: 年月日时分秒 + 5位随机数
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_str = ''.join(random.choices(string.digits, k=5))
    return f"{timestamp}{random_str}"

def generate_verification_code(length=6):
    """
    生成数字验证码
    """
    return ''.join(random.choices(string.digits, k=length))

def set_verification_code(key, code, expire=300):
    """
    设置验证码到内存字典
    """
    clean_expired_codes()  # 清理过期验证码
    
    full_key = f"verification_code:{key}"
    expire_time = time.time() + expire
    
    with verification_codes_lock:
        verification_codes[full_key] = {
            'code': code,
            'expire_time': expire_time
        }
    
    return code

def get_verification_code(key):
    """
    从内存字典获取验证码
    """
    clean_expired_codes()  # 清理过期验证码
    
    full_key = f"verification_code:{key}"
    
    with verification_codes_lock:
        if full_key in verification_codes:
            return verification_codes[full_key]['code']
    
    return None

def delete_verification_code(key):
    """
    删除内存字典中的验证码
    """
    full_key = f"verification_code:{key}"
    
    with verification_codes_lock:
        if full_key in verification_codes:
            del verification_codes[full_key]

def validate_phone(phone):
    """
    验证手机号格式
    """
    return re.match(r'^1[3-9]\d{9}$', phone) is not None

def validate_email(email):
    """
    验证邮箱格式
    """
    return re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email) is not None

def get_wechat_openid(code):
    """
    通过微信 code 获取 openid
    """
    app_id = current_app.config['WECHAT_APP_ID']
    app_secret = current_app.config['WECHAT_APP_SECRET']
    
    url = f"https://api.weixin.qq.com/sns/jscode2session?appid={app_id}&secret={app_secret}&js_code={code}&grant_type=authorization_code"
    
    try:
        response = requests.get(url)
        data = response.json()
        
        if 'openid' in data:
            return data['openid']
        else:
            current_app.logger.error(f"获取微信 openid 失败: {data}")
            return None
    except Exception as e:
        current_app.logger.error(f"获取微信 openid 异常: {str(e)}")
        return None

def merchant_required(fn):
    """
    商家权限装饰器
    """
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        from models import User
        
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not user.is_merchant:
            return error_response("没有商家权限", "merchant_required", 403)
        
        return fn(*args, **kwargs)
    
    return wrapper

def admin_required(fn):
    """
    管理员权限装饰器
    """
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        from models import User
        
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or not user.is_merchant:
            return error_response("没有管理员权限", "admin_required", 403)
        
        return fn(*args, **kwargs)
    
    return wrapper

def user_required(fn):
    """
    用户权限装饰器
    """
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        from models import User
        
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return error_response("用户不存在", "user_not_found", 404)
        
        return fn(*args, **kwargs)
    
    return wrapper

def paginate(query, page=1, per_page=10):
    """
    分页查询
    """
    try:
        page = int(page)
        per_page = int(per_page)
    except (TypeError, ValueError):
        page = 1
        per_page = 10
    
    if page < 1:
        page = 1
    
    if per_page < 1:
        per_page = 10
    
    if per_page > 100:
        per_page = 100
    
    items = query.limit(per_page).offset((page - 1) * per_page).all()
    total = query.count()
    
    return {
        "list": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page
    }

def model_to_dict(model, exclude=None):
    """
    模型转字典
    """
    if exclude is None:
        exclude = []
    
    result = {}
    for column in model.__table__.columns:
        if column.name not in exclude:
            value = getattr(model, column.name)
            if isinstance(value, datetime):
                value = value.strftime('%Y-%m-%d %H:%M:%S')
            result[column.name] = value
    
    return result 
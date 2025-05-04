from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError

from models import db, User, MerchantInfo
from utils import success_response, error_response, admin_required

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/login', methods=['POST'])
def admin_login():
    """
    管理员登录
    """
    data = request.get_json()
    
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return error_response('账号和密码不能为空')
    
    # 查找用户
    user = User.query.filter_by(username=username, is_merchant=True).first()
    
    if not user:
        return error_response('管理员账号不存在')
    
    # 验证密码
    if not user.verify_password(password):
        return error_response('密码错误')
    
    # 获取商家信息
    merchant_info = MerchantInfo.query.filter_by(user_id=user.id).first()
    
    if not merchant_info:
        return error_response('管理员信息不存在')
    
    # 生成JWT令牌
    access_token = create_access_token(identity=user.id)
    
    # 构建管理员信息
    admin_info = user.to_dict()
    admin_info.update({
        'shop_name': merchant_info.shop_name,
        'shop_logo': merchant_info.shop_logo,
        'shop_desc': merchant_info.shop_desc,
        'contact_phone': merchant_info.contact_phone,
        'contact_email': merchant_info.contact_email
    })
    
    return success_response({
        'token': access_token,
        'adminInfo': admin_info
    }, '登录成功')

@admin_bp.route('/info', methods=['GET'])
@admin_required
def get_admin_info():
    """
    获取管理员信息
    """
    user_id = int(get_jwt_identity())
    
    # 查找用户
    user = User.query.filter_by(id=user_id, is_merchant=True).first()
    
    if not user:
        return error_response('管理员不存在')
    
    # 获取商家信息
    merchant_info = MerchantInfo.query.filter_by(user_id=user.id).first()
    
    if not merchant_info:
        return error_response('管理员信息不存在')
    
    # 构建管理员信息
    admin_info = user.to_dict()
    admin_info.update({
        'shop_name': merchant_info.shop_name,
        'shop_logo': merchant_info.shop_logo,
        'shop_desc': merchant_info.shop_desc,
        'contact_phone': merchant_info.contact_phone,
        'contact_email': merchant_info.contact_email
    })
    
    return success_response({
        'adminInfo': admin_info
    })
 
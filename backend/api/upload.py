from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import uuid
from werkzeug.utils import secure_filename
from datetime import datetime

from utils import success_response, error_response, merchant_required

upload_bp = Blueprint('upload', __name__)

# 允许的文件类型
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@upload_bp.route('/', methods=['POST'])
@jwt_required()
def upload_file():
    """
    上传文件API
    支持图片上传
    """
    # 检查是否有文件
    if 'file' not in request.files:
        return error_response('未找到上传的文件')
    
    file = request.files['file']
    
    # 检查文件名是否为空
    if file.filename == '':
        return error_response('未选择文件')
    
    # 检查文件类型
    if not allowed_file(file.filename):
        return error_response('不支持的文件类型')
    
    # 生成安全的文件名
    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[1].lower()
    new_filename = f"{uuid.uuid4().hex}.{ext}"
    
    # 确定上传类型和保存路径
    upload_type = request.form.get('type', 'common')
    
    # 根据不同类型保存到不同文件夹
    if upload_type == 'product':
        save_dir = 'uploads/products'
    elif upload_type == 'category':
        save_dir = 'uploads/categories'
    elif upload_type == 'merchant':
        save_dir = 'uploads/merchants'
    elif upload_type == 'avatar':
        save_dir = 'uploads/avatars'
    else:
        save_dir = 'uploads/common'
    
    # 使用当前工作目录作为基础路径
    current_dir = os.getcwd()
    upload_path = os.path.join(current_dir, 'static', save_dir)
    
    # 确保目录存在
    if not os.path.exists(upload_path):
        os.makedirs(upload_path)
    
    # 保存文件
    file_path = os.path.join(upload_path, new_filename)
    file.save(file_path)
    
    # 构建相对URL路径，让前端能够访问
    relative_path = f"/static/{save_dir}/{new_filename}"
    
    # 获取当前请求的host
    host = request.host_url.rstrip('/')
    
    # 构建完整URL
    url = f"{host}{relative_path}"
    
    # 如果你想直接使用相对路径，可以使用下面的代码代替上面的url
    # url = relative_path
    
    return success_response({
        'url': url,
        'filename': new_filename,
        'local_path': file_path  # 添加本地文件路径，方便调试
    }, '文件上传成功') 
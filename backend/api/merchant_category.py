from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from datetime import datetime

from models import db, User, MerchantInfo, ProductCategory
from utils import success_response, error_response, merchant_required, model_to_dict

merchant_category_bp = Blueprint('merchant_category', __name__)

@merchant_category_bp.route('/add', methods=['POST'])
@merchant_required
def add_category():
    """
    添加商品分类
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # 必要字段验证
    if not data.get('name'):
        return error_response('分类名称不能为空')
    
    try:
        # 创建新分类
        new_category = ProductCategory(
            name=data.get('name'),
            description=data.get('description', ''),
            parent_id=data.get('parent_id'),
            sort_order=data.get('sort_order', 0),
            image_url=data.get('image_url', ''),
            created_by=user_id
        )
        
        db.session.add(new_category)
        db.session.commit()
        
        return success_response({
            'id': new_category.id,
            'name': new_category.name
        }, '分类添加成功')
        
    except IntegrityError as e:
        db.session.rollback()
        current_app.logger.error(f"添加分类失败 - 完整性错误: {str(e)}")
        return error_response('该分类名称已存在')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"添加分类失败: {str(e)}")
        return error_response('添加分类失败，请稍后再试')

@merchant_category_bp.route('/update', methods=['POST'])
@merchant_required
def update_category():
    """
    更新商品分类
    """
    user_id = get_jwt_identity()
    data = request.get_json()
    
    # 必要字段验证
    if not data.get('id'):
        return error_response('分类ID不能为空')
    
    if not data.get('name'):
        return error_response('分类名称不能为空')
    
    try:
        # 查找要更新的分类
        category = ProductCategory.query.filter_by(id=data.get('id')).first()
        
        if not category:
            return error_response('分类不存在')
        
        # 更新分类信息
        category.name = data.get('name')
        category.description = data.get('description', '')
        category.parent_id = data.get('parent_id')
        category.sort_order = data.get('sort_order', 0)
        category.image_url = data.get('image_url', '')
        category.updated_at = datetime.now()
        category.updated_by = user_id
        
        db.session.commit()
        
        return success_response({
            'id': category.id,
            'name': category.name
        }, '分类更新成功')
        
    except IntegrityError as e:
        db.session.rollback()
        current_app.logger.error(f"更新分类失败 - 完整性错误: {str(e)}")
        return error_response('该分类名称已存在')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"更新分类失败: {str(e)}")
        return error_response('更新分类失败，请稍后再试')

@merchant_category_bp.route('/delete', methods=['POST'])
@merchant_required
def delete_category():
    """
    删除商品分类
    """
    data = request.get_json()
    
    # 必要字段验证
    if not data.get('id'):
        return error_response('分类ID不能为空')
    
    try:
        # 查找要删除的分类
        category = ProductCategory.query.filter_by(id=data.get('id')).first()
        
        if not category:
            return error_response('分类不存在')
        
        # 检查是否有子分类
        children = ProductCategory.query.filter_by(parent_id=category.id).first()
        if children:
            return error_response('该分类下有子分类，无法删除')
        
        # 检查是否有关联的商品
        from models import Product
        products = Product.query.filter_by(category_id=category.id).first()
        if products:
            return error_response('该分类下有商品，无法删除')
        
        # 删除分类
        db.session.delete(category)
        db.session.commit()
        
        return success_response(message='分类删除成功')
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"删除分类失败: {str(e)}")
        return error_response('删除分类失败，请稍后再试') 
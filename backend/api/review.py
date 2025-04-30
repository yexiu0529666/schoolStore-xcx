from flask import Blueprint, request, current_app, jsonify
from flask_jwt_extended import get_jwt_identity
import json
from sqlalchemy import func

from models import db, User, ProductReview, Product, OrderItem, Order, OrderStatus
from utils import success_response, error_response, user_required

review_bp = Blueprint('review', __name__)


@review_bp.route('/submit', methods=['POST'])
@user_required
def submit_review():
    """提交商品评价"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    order_item_id = data.get('order_item_id')
    rating = data.get('rating', 5)
    content = data.get('content', '')
    images = data.get('images', [])
    is_anonymous = data.get('is_anonymous', False)
    
    # 验证参数
    if not order_item_id:
        return error_response('订单项ID不能为空')
    
    if not isinstance(rating, int) or rating < 1 or rating > 5:
        return error_response('评分必须是1-5之间的整数')
    
    # 查询订单项
    order_item = OrderItem.query.get(order_item_id)
    if not order_item:
        return error_response('订单项不存在')
    
    # 验证订单项是否属于当前用户
    order = Order.query.get(order_item.order_id)
    if not order or order.user_id != user_id:
        return error_response('无权评价此订单')
    
    # 验证订单状态是否为已完成
    if order.status != OrderStatus.COMPLETED:
        return error_response('只能评价已完成的订单')
    
    # 检查是否已评价
    if order_item.is_reviewed:
        return error_response('此订单项已评价')
    
    try:
        # 创建评价
        review = ProductReview(
            user_id=user_id,
            product_id=order_item.product_id,
            order_item_id=order_item_id,
            rating=rating,
            content=content,
            images=images,
            is_anonymous=is_anonymous
        )
        
        # 更新订单项评价状态
        order_item.is_reviewed = True
        
        db.session.add(review)
        db.session.commit()
        
        return success_response({
            'review_id': review.id
        }, '评价提交成功')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"提交评价异常: {str(e)}")
        return error_response('评价提交失败，请稍后再试')


@review_bp.route('/list/<int:product_id>', methods=['GET'])
def get_product_reviews(product_id):
    """获取商品评价列表"""
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    filter = request.args.get('filter')
    
    # 验证商品是否存在
    product = Product.query.get(product_id)
    if not product:
        return error_response('商品不存在')
    
    # 查询商品评价
    query = ProductReview.query.filter_by(
        product_id=product_id,
        status='approved'
    )
    
    # 根据filter参数过滤评价
    if filter == 'good':
        query = query.filter(ProductReview.rating > 3)
    elif filter == 'medium':
        query = query.filter(ProductReview.rating == 3)
    elif filter == 'bad':
        query = query.filter(ProductReview.rating < 3)
    elif filter == 'hasImage':
        query = query.filter(ProductReview.images != None, func.json_length(ProductReview.images) > 0)
    
    # 统计总数
    total = query.count()
    
    # 计算平均评分
    avg_rating = db.session.query(db.func.avg(ProductReview.rating))\
        .filter_by(product_id=product_id, status='approved')\
        .scalar() or 0
    avg_rating = round(float(avg_rating), 1)
    
    # 分页查询
    reviews = query.order_by(ProductReview.created_at.desc())\
        .offset((page - 1) * limit).limit(limit).all()
    
    # 格式化评价数据
    review_list = []
    for review in reviews:
        user = User.query.get(review.user_id)
        user_info = {
            'nickname': '匿名用户' if review.is_anonymous else (user.nickname or '用户'),
            'avatar': user.avatar if not review.is_anonymous and user.avatar else '/static/images/default-avatar.svg'
        }
        
        review_list.append({
            'id': review.id,
            'user': user_info,
            'rating': review.rating,
            'content': review.content,
            'images': review.images or [],
            'created_at': review.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    return success_response({
        'total': total,
        'avg_rating': avg_rating,
        'list': review_list,
        'page': page,
        'limit': limit
    })


@review_bp.route('/my', methods=['GET'])
@user_required
def get_my_reviews():
    """获取我的评价列表"""
    user_id = get_jwt_identity()
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    
    # 查询用户评价
    query = ProductReview.query.filter_by(user_id=user_id)
    
    # 统计总数
    total = query.count()
    
    # 分页查询
    reviews = query.order_by(ProductReview.created_at.desc())\
        .offset((page - 1) * limit).limit(limit).all()
    
    # 格式化评价数据
    review_list = []
    for review in reviews:
        product = Product.query.get(review.product_id)
        
        review_list.append({
            'id': review.id,
            'product_id': review.product_id,
            'product_name': product.name if product else '',
            'product_image': product.main_image if product else '',
            'rating': review.rating,
            'content': review.content,
            'images': review.images or [],
            'is_anonymous': review.is_anonymous,
            'status': review.status,
            'created_at': review.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    return success_response({
        'total': total,
        'list': review_list,
        'page': page,
        'limit': limit
    })


@review_bp.route('/delete/<int:review_id>', methods=['POST'])
@user_required
def delete_review(review_id):
    """删除我的评价"""
    user_id = get_jwt_identity()
    
    # 查询评价
    review = ProductReview.query.get(review_id)
    if not review:
        return error_response('评价不存在')
    
    # 验证评价是否属于当前用户
    if review.user_id != user_id:
        return error_response('无权删除此评价')
    
    try:
        # 更新订单项评价状态
        order_item = OrderItem.query.get(review.order_item_id)
        if order_item:
            order_item.is_reviewed = False
        
        # 删除评价
        db.session.delete(review)
        db.session.commit()
        
        return success_response(message='评价已删除')
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"删除评价异常: {str(e)}")
        return error_response('删除评价失败，请稍后再试') 
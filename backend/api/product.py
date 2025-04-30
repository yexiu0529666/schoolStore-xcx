from flask import Blueprint, request, current_app
from sqlalchemy import func

from models import db, Product, ProductCategory, ProductImage, ProductSpec, ProductReview, User
from utils import success_response, error_response, paginate, model_to_dict

product_bp = Blueprint('product', __name__)

@product_bp.route('/list', methods=['GET'])
def get_product_list():
    """
    获取商品列表
    """
    # 获取查询参数
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('limit', 10, type=int)
    category_id = request.args.get('categoryId', type=int)
    keyword = request.args.get('keyword', '')
    is_hot = request.args.get('isHot', '', type=str)
    is_new = request.args.get('isNew', '', type=str)
    is_recommend = request.args.get('isRecommend', '', type=str)
    sort_by = request.args.get('sortBy', 'default')
    
    # 构建查询
    query = Product.query.filter(Product.is_on_sale == True)
    
    # 分类筛选
    if category_id:
        # 查询包括子分类
        category_ids = [category_id]
        sub_categories = ProductCategory.query.filter_by(parent_id=category_id).all()
        category_ids.extend([cat.id for cat in sub_categories])
        query = query.filter(Product.category_id.in_(category_ids))
    
    # 关键词搜索
    if keyword:
        query = query.filter(Product.name.like(f'%{keyword}%'))
    
    # 热门商品
    if is_hot.lower() == 'true':
        query = query.filter(Product.is_hot == True)
    
    # 新品
    if is_new.lower() == 'true':
        query = query.filter(Product.is_new == True)
    
    # 推荐商品
    if is_recommend.lower() == 'true':
        query = query.filter(Product.is_recommend == True)
    
    # 排序
    if sort_by == 'price_asc':
        query = query.order_by(Product.price.asc())
    elif sort_by == 'price_desc':
        query = query.order_by(Product.price.desc())
    elif sort_by == 'sales_desc':
        query = query.order_by(Product.sales.desc())
    elif sort_by == 'new':
        query = query.order_by(Product.created_at.desc())
    else:
        # 默认排序：推荐优先，然后是热门，然后是销量
        query = query.order_by(Product.is_recommend.desc(), Product.is_hot.desc(), Product.sales.desc())
    
    # 分页查询
    pagination = paginate(query, page, per_page)
    
    # 处理结果
    products = []
    for item in pagination['list']:
        product_dict = model_to_dict(item, exclude=['description'])
        products.append(product_dict)
    
    pagination['list'] = products
    
    return success_response(pagination)

@product_bp.route('/detail/<int:product_id>', methods=['GET'])
def get_product_detail(product_id):
    """
    获取商品详情
    """
    product = Product.query.get(product_id)
    
    if not product:
        return error_response('商品不存在', status_code=404)
    
    # 增加浏览次数（这里简化处理，实际应该考虑用户唯一性）
    
    # 构建详细信息
    result = model_to_dict(product)
    
    # 获取商品图片
    images = ProductImage.query.filter_by(product_id=product_id).order_by(ProductImage.sort_order).all()
    result['images'] = [img.image_url for img in images]
    
    # 获取商品规格
    specs = ProductSpec.query.filter_by(product_id=product_id).all()
    result['specs'] = [model_to_dict(spec) for spec in specs]
    
    # 获取分类信息
    if product.product_category:
        result['category'] = model_to_dict(product.product_category, exclude=['created_at', 'updated_at'])
    else:
        result['category'] = None
    
    # 获取商品评价信息
    # 计算平均评分
    avg_rating = db.session.query(func.avg(ProductReview.rating))\
        .filter(ProductReview.product_id == product_id, ProductReview.status == 'approved')\
        .scalar() or 0
    result['avg_rating'] = round(float(avg_rating), 1)
    
    # 评价数量
    review_count = ProductReview.query.filter_by(product_id=product_id, status='approved').count()
    result['review_count'] = review_count
    
    # 获取最新几条评价
    latest_reviews = ProductReview.query.filter_by(
        product_id=product_id, 
        status='approved'
    ).order_by(ProductReview.created_at.desc()).limit(2).all()
    
    reviews = []
    for review in latest_reviews:
        user = User.query.get(review.user_id)
        user_info = {
            'nickname': '匿名用户' if review.is_anonymous else (user.nickname or '用户'),
            'avatar': user.avatar if not review.is_anonymous and user.avatar else '/static/images/default-avatar.svg'
        }
        
        reviews.append({
            'id': review.id,
            'user': user_info,
            'rating': review.rating,
            'content': review.content,
            'images': review.images or [],
            'created_at': review.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    result['reviews'] = reviews
    
    return success_response(result)

@product_bp.route('/categories', methods=['GET'])
def get_categories():
    """
    获取商品分类
    """
    # 只获取一级分类
    categories = ProductCategory.query.filter_by(parent_id=None).order_by(ProductCategory.sort_order).all()
    
    result = []
    for category in categories:
        cat_dict = model_to_dict(category, exclude=['created_at', 'updated_at'])
        
        # 获取子分类
        sub_categories = ProductCategory.query.filter_by(parent_id=category.id).order_by(ProductCategory.sort_order).all()
        cat_dict['sub_categories'] = [model_to_dict(sub, exclude=['created_at', 'updated_at']) for sub in sub_categories]
        
        result.append(cat_dict)
    
    return success_response(result)

@product_bp.route('/hot', methods=['GET'])
def get_hot_products():
    """
    获取热门商品
    """
    limit = request.args.get('limit', 10, type=int)
    
    products = Product.query.filter(Product.is_on_sale == True, Product.is_hot == True) \
                           .order_by(Product.sales.desc()) \
                           .limit(limit).all()
    
    result = []
    for product in products:
        product_dict = model_to_dict(product, exclude=['description'])
        result.append(product_dict)
    
    return success_response(result)

@product_bp.route('/search', methods=['GET'])
def search_products():
    """
    搜索商品
    """
    keyword = request.args.get('keyword', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('limit', 10, type=int)
    
    if not keyword:
        return error_response('搜索关键词不能为空')
    
    # 构建查询
    query = Product.query.filter(
        Product.is_on_sale == True,
        Product.name.like(f'%{keyword}%')
    )
    
    # 分页查询
    pagination = paginate(query, page, per_page)
    
    # 处理结果
    products = []
    for item in pagination['list']:
        product_dict = model_to_dict(item, exclude=['description'])
        products.append(product_dict)
    
    pagination['list'] = products
    
    return success_response(pagination) 
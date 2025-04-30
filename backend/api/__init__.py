from flask import Blueprint

# Blueprint definitions
api_bp = Blueprint('api', __name__, url_prefix='/api')

# These are the actual blueprint instances
from .user import user_bp
from .product import product_bp
from .cart import cart_bp
from .order import order_bp
from .review import review_bp

# Register blueprints with the main api_bp
api_bp.register_blueprint(user_bp, url_prefix='/user')
api_bp.register_blueprint(product_bp, url_prefix='/product')
api_bp.register_blueprint(cart_bp, url_prefix='/cart')
api_bp.register_blueprint(order_bp, url_prefix='/order')
api_bp.register_blueprint(review_bp, url_prefix='/review') 
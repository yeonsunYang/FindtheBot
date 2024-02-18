"""
routing for websocket

[ny]Definite ws_urlpatterns on game/routing.py.
(config/urls.py - game/urls.py 의 관계)

"""
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator 
from channels.sessions import SessionMiddlewareStack
import game.routing


application = ProtocolTypeRouter({
    'websocket': AllowedHostsOriginValidator( #[ny]To seperate websocket session.
        SessionMiddlewareStack(
        URLRouter(
            game.routing.ws_urlpatterns
        )
    )
    ),
})

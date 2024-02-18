"""
Django admin config.

[ny]Register the model to access django admin.

"""
from django.contrib import admin
from .models import Member,Channel_1, Channel_2, Channel_3, Channel_4, Entries

class EntriesAdmin(admin.ModelAdmin):
    list_display = ('image_id', 'emotion_id', 'E1_flag', 'E2_flag', 'E3_flag')
    search_fields = ['image_id', 'emotion_id']
    
#[ny]Register the models controled on admin
admin.site.register(Member)
admin.site.register(Channel_1)
admin.site.register(Channel_2)
admin.site.register(Channel_3)
admin.site.register(Channel_4)
admin.site.register(Entries, EntriesAdmin)



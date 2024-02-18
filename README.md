<div align="center">
   <h1>Welcome to Find the Bot 🤖</h1>
    <img src="https://github.com/yeonsunYang/FindtheBot/blob/main/mainlogo.gif?raw=true" width="400">
   <br> 
   This is the official repository for our <b>CHI 2024 paper</b>:<br>
    <a href="">Find the Bot!: Gamifying Facial Emotion Recognition for Both Human Training and Machine Learning Data Collection </a><i>(To appear)</i>
</div><br><br><br>

   ```
@inproceedings{yang2024findbot,
  title={Find the Bot!: Gamifying Facial Emotion Recognition for Both Human Training and Machine Learning Data Collection},
  author={Yang, Yeonsun and Shin, Ahyeon and Kim, Nayoung and Woo, Huidam and Chung, John Joon Young and Song, Jean Y.},
  booktitle={Proceedings of the ACM/SIGCHI Conference on Human Factors in Computing Systems},
  year={2024},
  note={Conditionally accepted}
}
 ```
<br>

<h2>🔗 Demo Video</h2>

<div align="center">
   <a href="https://www.youtube.com/watch?v=vjxHJvrnhFk">
    <img src="https://img.youtube.com/vi/vjxHJvrnhFk/maxresdefault.jpg" alt="demo video" style="width:500px;">
</a>
   <br>
   🔼 Click the thumbnail for a demo video on YouTube!
</div>
<br>


<h2>🎮 Running the Game</h2>

<h3>👩‍💻 Local test ver. </h3>

<h4>Step 0. Environment setup </h4>

The environment we have set up for `Find the Bot!`, a web-based multiplayer game, is as follows:
```
python == 3.6.8
Django == 3.2.16
channels == 3.0.4
cntk == 2.7
```

```python
# Caution: If you have completed the installation of CNTK 2.7, please upgrade it to the 'gpu version'!

$pip install --upgrade --no-deps cntk-gpu
```

Ensure you adhere to the **specified versions** of `Python`, `Django` and other Python `libraries`, as they have interdependencies that are crucial for the setup. A detailed list of dependencies in our virtual environment for running the code is included in `requirements.txt`.

<br>
<h4>Step 1. Preparing facial expression images </h4>
First, you need to prepare facial expression images for use in the game. In our paper, we utilized the <a href="http://mohammadmahoor.com/affectnet/">AffectNet</a> dataset; however, due to licensing issues, we are unable to upload the actual images to the repository. If you have a specific set of facial expression images you wish to use, that would be a suitable option.
<br><br>

Second, you need to modify the `\static\sampling_300.csv` file to match the images you have. We have uploaded a sample csv file that we used. The format of the CSV file is as belows:
| image file name | emotion label |
|-----------------|---------------|
|img_12           |0              |
|img_40           |2              |
|...              |...            |

In each game round, 4 players and the bot are assigned four images from the list in the `\static\sampling_300.csv` file. `emotion label` in the csv file is provided as a hint for the players. Default emotions and their label codes are as follows:
|emotion |label|
|--------|-----|
|Neutral |0    |
|Happy   |1    |
|Sad     |2    |
|Surprise|3    |
|Fear    |4    |
|Disgust |5    |
|Anger   |6    |
|Contempt|7    |


Third, you need to place the actual images in the `\static\images\sampling` and `\static\images\sampling_bot`. The original image files should be located in the `\static\images\sampling` folder, while preprocessed versions for the <a href="https://github.com/Microsoft/FERPlus">DCNN model</a> (the bot 🤖) belong in the `\static\images\sampling_bot` folder. To be input into the model, facial expression images must adhere to the following format:
```
1. 48 x 48 PNG files
2. Grayscale image
3. 24-bit depth
```

<br>
<h4>Step 2. Creating <i>Entries</i> model objects </h4>

We implemented a model `Entries` in Django to ensure that each image appears as evenly as possible, in accordance with our DB storage policy, despite the images being assigned randomly. Thus, you only need to create the `Entries` objects once at the beginning by running the `\game\create_objects.py` file.

```
python create_objects.py
```

By default, all images are displayed up to <ins>three times</ins>. If you wish to increase the display chances, please modify the code in `\game\models.py` and `\game\consumers.py`. 
<br><br><br>

<h4> Step 3. Running the codes </h4>

* <b>Server-side:</b>
Once all the initial setup is complete, you can run the game in a <ins>local environment</ins> by executing `\manage.py`.

```
python manage.py runserver
```

* <b>Client-side (Player):</b>
Access the follwing URL through your local web brower.

```
http://localhost:8000/game/
```

* <b>Client-side (Admin):</b>
Access the following URL if you need to manage user registration, game channel access status, etc. 

```
http://localhost:8000/admin/
```

<br><br>

<h3>👨‍👩‍👧‍👦 External server ver. </h3>

<h4>Step 0. Configurations </h4>

If you want to release the game online and allow external users to access and play it througth the game's URL on their own devices, please modify only the following section in the `/static/channels.js` after <ins>completing your web server setup</ins>.

```javascript
// Server:
let socket = new WebSocket('wss://[your web server address]' + room_number+ '/' +username+ '/' +teamid );
// Local:
//let socket = new WebSocket('ws://127.0.0.1:8000/ws/game/' + room_number+ '/' +username+ '/' +teamid );
```

<h4>Step 1. Running the codes </h4>

If the setup on the web server is complete as you did with the local version, run the code on the web server.

```
python manage.py runserver
```

Then, anyone can access the web-based game `Find the Bot!` through the web URL.

<br><br><br>
<h3>🗂️ Codes </h3>

```
config
├── asgi.py            # ASGI configuration for asynchronous web app
├── routing.py         # defining WebSocket routing configurations
├── settings.py        # settings for the Django project
├── urls.py            # maps URLs to Django apps
└── wsgi.py            # WSGI configuration

game
├── migrations         # migration files for DB schema changes
├── admin.py           # configuring the Django admin interface
├── consumers.py       # handling Websocket connections 
├── models.py          # defining the data models
├── create_objects.py  # declaration of Entries model objects
├── routing.py         # managing Websocket routes for consumer connections
├── urls.py            # maps URLs to Django views
├── views.py           # logic and control flow for handling requests
└── _util.py           # files for running pretrained DCNN model (the bot)

static
├── css                # css files for styling and animations
├── images             # image files used in the game
├── js                 # JavaScript files for client-side functionality
├── bot.model          # a pretrained DCNN model for the bot 
└── sampling_300.csv   # a CSV file for sampling facial expression images in the game

templates
├── index.html         # login page
├── info.html          # user profile page
├── tutorial.html      # tutorial page
├── channels.html      # joining game channels page
├── game.html          # main game playing page
└── ending.html        # end of game page

```

<br><br><br>

<h2>⭐ Acknowledgments</h2>

Code derived and rehashed from:
* <a href="https://github.com/Microsoft/FERPlus">DCNN model</a> for facial emotion recognition (the bot)
* In-the-wild facial emotion recognition image datasets (<a href="https://ieeexplore.ieee.org/abstract/document/8013713">AffectNet</a>, <a href="https://dl.acm.org/doi/abs/10.1145/2993148.2993165">FER+</a>)

<br><br>
🧀Special thanks to <a href="https://github.com/arter97">arter97</a> for assistance with server setup and development contributions. 

<br><br><br>

<h2>📞 Contact</h2>

If you have any questions or would like to hear more about this project, please feel free to shoot us an eamil at: [diddustjs98@dgist.ac.kr](mailto:diddustjs98@dgist.ac.kr) or [ahyeon@dgist.ac.kr](mailto:ahyeon@dgist.ac.kr)!

! !!
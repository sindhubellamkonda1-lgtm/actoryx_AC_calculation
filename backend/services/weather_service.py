import requests
API_KEY = "6f6a63783866997b4398c02920bc536d"
def get_live_temperature(city="Hyderabad"):
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
    response = requests.get(url)
    data = response.json()
    return data["main"]["temp"]
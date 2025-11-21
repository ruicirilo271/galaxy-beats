# -*- coding: utf-8 -*-
import requests
from flask import Flask, render_template, request, jsonify
from urllib.parse import quote
from functools import lru_cache

app = Flask(__name__)

# API JioSaavn (a que devolve o JSON que mostraste)
JIOSAAVN_API = "https://jiosaavn-api-privatecvc2.vercel.app"

# ⬇️ Mete aqui a tua API KEY do Last.fm
LASTFM_API_KEY = "6e7c0a29cd508f42a6737e5fd3d6110b"

LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/"


@app.route("/")
def index():
    return render_template("index.html")


# -------------------------------------------------
# SEARCH — usa JioSaavn, devolve os mesmos campos
# -------------------------------------------------
@app.route("/search")
def search():
    q = request.args.get("q", "")
    if not q:
        return jsonify({"error": "missing query"}), 400

    url = f"{JIOSAAVN_API}/search/songs?query={quote(q)}"
    r = requests.get(url, timeout=10)
    j = r.json()
    return jsonify(j)


# -------------------------------------------------
# PLAYER — página do player neon
# (playlist vem em localStorage, aqui só passamos dados base)
# -------------------------------------------------
@app.route("/player")
def player():
    title = request.args.get("title", "")
    cover = request.args.get("cover", "")
    url = request.args.get("url", "")
    artist = request.args.get("artist", "")
    index = request.args.get("index", "0")
    return render_template(
        "player.html",
        title=title,
        cover=cover,
        url=url,
        artist=artist,
        index=index
    )


# -------------------------------------------------
# STREAM — faz proxy do ficheiro .m4a/.mp4 (AAC)
# para audio/mp4, evitando CORS e problemas de MIME
# -------------------------------------------------
@app.route("/stream")
def stream():
    url = request.args.get("url")
    if not url:
        return "missing url", 400

    r = requests.get(url, stream=True)

    def generate():
        for chunk in r.iter_content(chunk_size=1024):
            if chunk:
                yield chunk

    return app.response_class(generate(), mimetype="audio/mp4")


# -------------------------------------------------
# ARTIST INFO — Last.fm: bio + top tracks + top albums + similares
# -------------------------------------------------
@lru_cache(maxsize=256)
def lastfm_call(params_tuple):
    """Pequeno cache em memória para não bater tanto no Last.fm."""
    params = dict(params_tuple)
    params["api_key"] = LASTFM_API_KEY
    params["format"] = "json"
    r = requests.get(LASTFM_BASE, params=params, timeout=10)
    return r.json()


@app.route("/artist_info")
def artist_info():
    name = request.args.get("name", "")
    if not name:
        return jsonify({"error": "missing artist name"}), 400

    # Info / bio
    info = lastfm_call((
        ("method", "artist.getinfo"),
        ("artist", name),
    ))

    # Top tracks
    top_tracks = lastfm_call((
        ("method", "artist.gettoptracks"),
        ("artist", name),
        ("limit", "10"),
    ))

    # Top albums
    top_albums = lastfm_call((
        ("method", "artist.gettopalbums"),
        ("artist", name),
        ("limit", "10"),
    ))

    # Similar artists
    similar = lastfm_call((
        ("method", "artist.getsimilar"),
        ("artist", name),
        ("limit", "10"),
    ))

    artist_data = info.get("artist", {})
    bio_summary = artist_data.get("bio", {}).get("summary", "")

    def extract_name_list(items, key="name", limit=10):
        res = []
        if isinstance(items, list):
            for i in items[:limit]:
                n = i.get(key)
                if n:
                    res.append(n)
        return res

    top_tracks_list = extract_name_list(top_tracks.get("toptracks", {}).get("track", []))
    top_albums_list = extract_name_list(top_albums.get("topalbums", {}).get("album", []))
    similar_artists_list = extract_name_list(similar.get("similarartists", {}).get("artist", []))

    image_url = ""
    imgs = artist_data.get("image", [])
    if imgs:
        image_url = imgs[-1].get("#text", "")

    return jsonify({
        "name": artist_data.get("name", name),
        "bio": bio_summary,
        "image": image_url,
        "top_tracks": top_tracks_list,
        "top_albums": top_albums_list,
        "similar_artists": similar_artists_list
    })


# ...

@app.route("/album_playlist")
def album_playlist():
    artist = request.args.get("artist", "")
    album = request.args.get("album", "")
    if not artist or not album:
        return jsonify({"error": "missing artist or album"}), 400

    # 1) Buscar info do álbum ao Last.fm (tracklist completo)
    info = lastfm_call((
        ("method", "album.getinfo"),
        ("artist", artist),
        ("album", album),
    ))

    album_obj = info.get("album", {})
    tracks = album_obj.get("tracks", {}).get("track", [])

    # Se vier só 1 track como dict, convertemos em lista
    if isinstance(tracks, dict):
        tracks = [tracks]

    playlist = []

    # 2) Para cada faixa do álbum → procurar no JioSaavn
    for t in tracks:
        name = t.get("name")
        if not name:
            continue

        query = f"{artist} {name}"
        try:
            res = requests.get(
                f"{JIOSAAVN_API}/search/songs?query={quote(query)}",
                timeout=10
            ).json()
        except Exception:
            continue

        songs = res.get("data", {}).get("results", [])
        if songs:
            # guardamos o primeiro resultado – estrutura igual à do /search
            playlist.append(songs[0])

    return jsonify({
        "status": "ok",
        "artist": artist,
        "album": album,
        "results": playlist
    })

if __name__ == "__main__":
    app.run(debug=True)

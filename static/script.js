let currentPlaylist = [];

// Pesquisa no backend /search (JioSaavn)
function searchSongs() {
  const q = document.getElementById("query").value.trim();
  if (!q) return;

  fetch(`/search?q=${encodeURIComponent(q)}`)
    .then(r => r.json())
    .then(json => {
      const div = document.getElementById("results");
      div.innerHTML = "";

      if (!json.data || !json.data.results || json.data.results.length === 0) {
        div.innerHTML = "<h3>Nenhum resultado encontrado</h3>";
        return;
      }

      currentPlaylist = json.data.results;
      // Guarda playlist em localStorage para o player usar
      localStorage.setItem("playlist", JSON.stringify(currentPlaylist));

      json.data.results.forEach((song, idx) => {
        const cover = song.image[2].link;
        const artists = song.primaryArtists;
        const url = song.downloadUrl[song.downloadUrl.length - 1].link; // melhor qualidade

        const card = `
          <div class="song">
            <img src="${cover}">
            <div style="flex:1">
              <h3>${song.name}</h3>
              <p>${artists}</p>
              <button class="btn" onclick="playFromIndex(${idx})">▶ Ouvir</button>
              <button class="btn2" onclick="addToPlaylistPrompt(${idx})">➕ Playlist</button>

            </div>
          </div>
        `;
        div.innerHTML += card;
      });
    })
    .catch(err => {
      console.error(err);
      alert("Erro ao contactar o backend");
    });
}

// Ao clicar em “Ouvir”: define índice atual e abre o player
function playFromIndex(index) {
  const playlist = JSON.parse(localStorage.getItem("playlist") || "[]");
  if (!playlist.length || !playlist[index]) return;

  localStorage.setItem("playlistIndex", String(index));

  const song = playlist[index];
  const cover = song.image[2].link;
  const url = song.downloadUrl[song.downloadUrl.length - 1].link;
  const artist = song.primaryArtists;

  const target = `/player?title=${encodeURIComponent(song.name)}`
    + `&cover=${encodeURIComponent(cover)}`
    + `&url=${encodeURIComponent(url)}`
    + `&artist=${encodeURIComponent(artist)}`
    + `&index=${index}`;

  window.location.href = target;
}
//-----------------------------------------
// SISTEMA DE PLAYLISTS (localStorage)
//-----------------------------------------

function getPlaylists() {
    return JSON.parse(localStorage.getItem("userPlaylists") || "{}");
}

function savePlaylists(obj) {
    localStorage.setItem("userPlaylists", JSON.stringify(obj));
}

function addToPlaylistPrompt(index) {
    const playlists = getPlaylists();

    let listNames = Object.keys(playlists);
    let newName = prompt(
        "Nome da playlist?\n\nJá existentes:\n" + 
        (listNames.length ? listNames.join("\n") : "(nenhuma)")
    );

    if (!newName) return;

    newName = newName.trim();
    if (!newName) return;

    if (!playlists[newName]) playlists[newName] = [];

    const song = currentPlaylist[index];
    playlists[newName].push(song);

    savePlaylists(playlists);
    alert("Música adicionada à playlist: " + newName);
}

//-----------------------------------------
// ABRIR UMA PLAYLIST (como um álbum)
//-----------------------------------------
function openPlaylist(name) {
    const playlists = getPlaylists();
    const list = playlists[name];
    if (!list || !list.length) {
        alert("Playlist vazia");
        return;
    }

    localStorage.setItem("playlist", JSON.stringify(list));
    localStorage.setItem("playlistIndex", "0");

    const first = list[0];
    const cover = first.image[2].link;
    const url = first.downloadUrl[first.downloadUrl.length - 1].link;

    const target = `/player?title=${encodeURIComponent(first.name)}
                   &cover=${encodeURIComponent(cover)}
                   &url=${encodeURIComponent(url)}
                   &artist=${encodeURIComponent(first.primaryArtists)}
                   &index=0`;

    window.location.href = target;
}
//-----------------------------------------
// Mostrar playlists na página inicial
//-----------------------------------------
function refreshPlaylistPanel() {
    const list = document.getElementById("playlistList");
    const playlists = getPlaylists();
    list.innerHTML = "";

    Object.keys(playlists).forEach(name => {
        const li = document.createElement("li");
        li.textContent = name;
        li.className = "playlistItem";
        li.onclick = () => openPlaylist(name);
        list.appendChild(li);
    });
}

document.addEventListener("DOMContentLoaded", refreshPlaylistPanel);
//--------------------------------------------
// SISTEMA COMPLETO DE PLAYLISTS
//--------------------------------------------

function getPlaylists() {
    return JSON.parse(localStorage.getItem("userPlaylists") || "{}");
}

function savePlaylists(obj) {
    localStorage.setItem("userPlaylists", JSON.stringify(obj));
}

let currentPlaylistName = null;

//---------------------------------------------------
// Criar Playlist
//---------------------------------------------------
function createPlaylist() {
    let name = prompt("Nome da nova playlist:");
    if (!name) return;

    name = name.trim();
    if (!name) return;

    const pls = getPlaylists();
    if (pls[name]) {
        alert("Já existe uma playlist com esse nome.");
        return;
    }

    pls[name] = [];
    savePlaylists(pls);
    refreshPlaylistPanel();
}

//---------------------------------------------------
// Adicionar música à playlist
//---------------------------------------------------
function addToPlaylistPrompt(index) {
    const pls = getPlaylists();
    const names = Object.keys(pls);

    let name = prompt(
        "Adicionar à playlist:\n\n" +
        (names.length ? names.join("\n") : "(nenhuma criada)") +
        "\n\nOu cria um nome novo:"
    );

    if (!name) return;
    name = name.trim();
    if (!name) return;

    if (!pls[name]) pls[name] = [];

    const song = currentPlaylist[index];
    pls[name].push(song);

    savePlaylists(pls);
    refreshPlaylistPanel();
    alert("Adicionada à playlist: " + name);
}

//---------------------------------------------------
// Abrir playlist como ALBUM / PLAYER
//---------------------------------------------------
function openPlaylist(name) {
    const pls = getPlaylists();
    const list = pls[name];
    if (!list || !list.length) {
        alert("Playlist vazia");
        return;
    }

    currentPlaylistName = name;
    openPlaylistEditor(name); // Abre o editor visual
}

//---------------------------------------------------
// Editor Visual da Playlist
//---------------------------------------------------
function openPlaylistEditor(name) {
    const pls = getPlaylists();
    const songs = pls[name];

    currentPlaylistName = name;

    document.getElementById("playlistEditorTitle").textContent = name;

    // capa = capa da primeira música
    if (songs.length > 0) {
        document.getElementById("playlistEditorCover").src =
            songs[0].image[2].link;
    }

    const ul = document.getElementById("playlistSongs");
    ul.innerHTML = "";

    songs.forEach((s, idx) => {
        const li = document.createElement("li");
        li.className = "playlistSongItem";
        li.innerHTML = `
            <span>${s.name} — ${s.primaryArtists}</span>
            <div class="songTools">
                <button onclick="moveSongUp(${idx})">⬆</button>
                <button onclick="moveSongDown(${idx})">⬇</button>
                <button onclick="removeSong(${idx})">🗑</button>
                <button onclick="playSpecificFromPlaylist(${idx})">▶</button>
            </div>
        `;
        ul.appendChild(li);
    });

    document.getElementById("playlistEditor").style.display = "flex";
}

function closePlaylistEditor() {
    document.getElementById("playlistEditor").style.display = "none";
}

//---------------------------------------------------
// Renomear
//---------------------------------------------------
function renamePlaylist() {
    let newName = prompt("Novo nome da playlist:", currentPlaylistName);
    if (!newName) return;

    newName = newName.trim();
    if (!newName) return;

    const pls = getPlaylists();

    if (pls[newName]) {
        alert("Já existe playlist com esse nome.");
        return;
    }

    pls[newName] = pls[currentPlaylistName];
    delete pls[currentPlaylistName];

    savePlaylists(pls);
    currentPlaylistName = newName;
    refreshPlaylistPanel();
    openPlaylistEditor(newName);
}

//---------------------------------------------------
// Apagar playlist
//---------------------------------------------------
function deletePlaylist() {
    if (!confirm("Apagar playlist '" + currentPlaylistName + "'?")) return;

    const pls = getPlaylists();
    delete pls[currentPlaylistName];
    savePlaylists(pls);
    refreshPlaylistPanel();
    closePlaylistEditor();
}

//---------------------------------------------------
// Remover uma música
//---------------------------------------------------
function removeSong(idx) {
    const pls = getPlaylists();
    const list = pls[currentPlaylistName];

    list.splice(idx, 1);

    savePlaylists(pls);
    openPlaylistEditor(currentPlaylistName);
    refreshPlaylistPanel();
}

//---------------------------------------------------
// Mover música para cima
//---------------------------------------------------
function moveSongUp(idx) {
    if (idx === 0) return;

    const pls = getPlaylists();
    const list = pls[currentPlaylistName];

    const tmp = list[idx - 1];
    list[idx - 1] = list[idx];
    list[idx] = tmp;

    savePlaylists(pls);
    openPlaylistEditor(currentPlaylistName);
}

//---------------------------------------------------
// Mover música para baixo
//---------------------------------------------------
function moveSongDown(idx) {
    const pls = getPlaylists();
    const list = pls[currentPlaylistName];

    if (idx >= list.length - 1) return;

    const tmp = list[idx + 1];
    list[idx + 1] = list[idx];
    list[idx] = tmp;

    savePlaylists(pls);
    openPlaylistEditor(currentPlaylistName);
}

//---------------------------------------------------
// Reproduzir Música Específica da Playlist
//---------------------------------------------------
function playSpecificFromPlaylist(idx) {
    const pls = getPlaylists();
    const list = pls[currentPlaylistName];

    if (!list[idx]) return;

    localStorage.setItem("playlist", JSON.stringify(list));
    localStorage.setItem("playlistIndex", idx);

    const s = list[idx];
    const cover = s.image[2].link;
    const url = s.downloadUrl[s.downloadUrl.length - 1].link;

    window.location.href =
      `/player?title=${encodeURIComponent(s.name)}&cover=${encodeURIComponent(cover)}&url=${encodeURIComponent(url)}&artist=${encodeURIComponent(s.primaryArtists)}&index=${idx}`;
}

//---------------------------------------------------
// Atualizar painel
//---------------------------------------------------
function refreshPlaylistPanel() {
    const pls = getPlaylists();
    const ul = document.getElementById("playlistList");

    if (!ul) return;

    ul.innerHTML = "";

    Object.keys(pls).forEach(name => {
        const songs = pls[name];

        const li = document.createElement("li");
        li.className = "playlistItem";

        const cover = songs.length
            ? songs[0].image[2].link
            : "/static/default_cover.png";

        li.innerHTML = `
            <img class="playlistThumb" src="${cover}">
            <span>${name} (${songs.length} músicas)</span>
        `;

        li.onclick = () => openPlaylist(name);
        ul.appendChild(li);
    });
}

document.addEventListener("DOMContentLoaded", refreshPlaylistPanel);

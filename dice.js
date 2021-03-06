const pool = [
  "https://v3-cinemeta.strem.io/catalog/movie/top/skip=0.json",
  "https://v3-cinemeta.strem.io/catalog/movie/top/skip=1.json",
  "https://v3-cinemeta.strem.io/catalog/movie/top/skip=2.json",
  "https://v3-cinemeta.strem.io/catalog/movie/top/skip=4.json",
  "https://v3-cinemeta.strem.io/catalog/movie/top/skip=5.json",
  "https://v3-cinemeta.strem.io/catalog/movie/imdbRating/skip=0.json",
  "https://v3-cinemeta.strem.io/catalog/movie/imdbRating/skip=1.json",
  "https://1fe84bc728af-imdb-list.beamup.dev/ls028057361/catalog/movie/imdb-movie-list.json",
  "https://1fe84bc728af-imdb-list.beamup.dev/ls041298577/catalog/movie/imdb-movie-list.json",
  "https://1fe84bc728af-imdb-list.beamup.dev/ls041868378/catalog/movie/imdb-movie-list.json",
  "https://1fe84bc728af-imdb-list.beamup.dev/ls045252260/catalog/movie/imdb-movie-list.json",
];

const state = {
  allMovies: [],
  allGenres: [],
  selectedGenre: localStorage.getItem("lastGenre") === "null" ? null : localStorage.getItem("lastGenre"),
};

const shuffleArray = (arr) =>
  arr
    .map((a) => [Math.random(), a])
    .sort((a, b) => a[0] - b[0])
    .map((a) => a[1]);

const fetchMovies = () => {
  const MAX_REQUESTS = 3;
  const requests = shuffleArray(pool)
    .slice(0, MAX_REQUESTS)
    .map((url) => fetch(url).then((resp) => resp.json()));

  // @TODO consider ignoring errors if only some of the requests failed
  Promise.all(requests).then((everything) => {
    const all = everything
      .map((x) => (Array.isArray(x.metas) ? x.metas : []))
      .reduce((a, b) => a.concat(b), []);

    state.allMovies = all;

    const firstInAGenre = all.filter(
      (movie, idx) =>
        all.findIndex((mv) => {
          return mv.genre?.some((genre) => movie.genre?.includes(genre));
        }) === idx
    );
    const genres = firstInAGenre.reduce((acc, movie) => {
      acc.push(...movie.genre);
      return acc;
    }, []);

    const uniqueGenres = genres.filter(
      (genre, idx) => genres.indexOf(genre) === idx
    );
    state.allGenres = uniqueGenres;

    populateGenres();
    populateMovie();
  });
};

function render(item) {
  const releaseInfo = item.releaseInfo || item.year;
  movieTitle.innerText = `${item.name}${
    releaseInfo ? " (" + releaseInfo + ")" : ""
  }`;
  openIn.href = `stremio://detail/${item.type}/${item.id}/${item.id}`;
  description.innerHTML = item.description || "";
  if (item.director)
    description.innerHTML += `<br><br><i>Director:</i> ${item.director}`;
  if (Array.isArray(item.cast) && item.cast.length)
    description.innerHTML += `<br><br><i>Cast:</i> ${item.cast.join(", ")}`;
  if (Array.isArray(item.genre) && item.genre.length)
    description.innerHTML += `<br><br><i>Genre:</i> ${item.genre.join(", ")}`;
  document.body.style.background = `url('https://images.metahub.space/background/medium/${item.id}/img')`;
}

const populateMovie = () => {
  const shuffled = shuffleArray(
    state.allMovies.filter((movie) => {
      return state.selectedGenre
        ? movie.genre?.includes(state.selectedGenre)
        : true;
    })
  );
  const item = shuffled[0];
  if(!item) {
    throw new Error('No movies in the list!');
  };

  console.log({ item });

  render(item);
  populateTrailers(item);

  const tryMore = !item.description || !item.director;
  if (tryMore)
    fetch(`https://v3-cinemeta.strem.io/meta/${item.type}/${item.id}.json`)
      .then((resp) => resp.json())
      .then((resp) => {
        if (resp.meta) render(resp.meta);
      });
};

const populateGenres = () => {
  state.allGenres.forEach(function (item) {
    const optionObj = document.createElement("option");
    optionObj.textContent = item;
    document.getElementById("test-dropdown").appendChild(optionObj);
  });
  const lastGenre = localStorage.getItem("lastGenre");
  if(!lastGenre || lastGenre === "null") {
    document.getElementById("test-dropdown").value = state.allGenres?.[0];
  } else if (state.allGenres?.includes(lastGenre)) {
    document.getElementById("test-dropdown").value = lastGenre;
  } else {
    fetchMovies();
  }
};

const populateTrailers = (movie) => {
  document.getElementById("trailers").innerHTML = '';
  movie?.trailers?.forEach((trailer, idx) => {
    if(idx > 2) return;
    const elem = document.createElement('iframe');
    elem.setAttribute('src', `https://www.youtube.com/embed/${trailer.source}`);
    elem.setAttribute('class', 'trailer');
    elem.setAttribute('allowfullscreen', true);
    // console.log({ elem });
    document.getElementById("trailers").appendChild(elem);
  });
};

function onGenreSelected() {
  state.selectedGenre = document.getElementById("test-dropdown").value;
  localStorage.setItem("lastGenre", state.selectedGenre);
  populateMovie();
  // alert(select.options[select.selectedIndex].text);
}

fetchMovies();

# Chrunchyroll Dub Caption Extension

Crunchyroll has English/Spanish subtitles available when watching anime in Japanese.
However, there are no subtitles available when watching the dubed version of the same show.
This creates accessibility issues for people who are hard of hearing and still want to watch the dubbed version of the show.
This chrome extension works by inspecting network requests to Crunchyroll and extracting the the subtitles files avalable for the Japanese Anime.
Once, you change the audio settings and change the Dubed version of the show, captions will appear in a dev-tools tab called "Crunchyroll Subtitles"

## Running this extension

1. Clone this repository.
2. Load this directory in Chrome as an [unpacked extension](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked).
3. Navigate to a webpage and open the devtools window.
4. Navigate to the new devtools panel named "Crunchyroll Subtitles".


## Contributing

Feel free to open pull requests or open issues for this project.
Note: I plan to keep this project active until Crunchyroll adds official support for dubbed subtitles on their website.

import { Link } from 'react-router'
import { Prose } from '../components/Prose'

export function TermsPage() {
  return (
    <Prose title="Terms of Use" updated="November 7, 2026">
      <p>By using AniHanko you agree to these terms. They are short, we promise.</p>

      <h2>An unofficial fan project</h2>
      <p>
        AniHanko is a free, non-commercial personal project. It is not affiliated with, endorsed by or connected to
        AniList, MyAnimeList, or any anime studio, publisher or streaming service.
      </p>

      <h2>Who owns the content</h2>
      <p>
        Anime titles, descriptions, posters, banners, character images and trailers belong to their respective owners.
        AniHanko shows this content through the{' '}
        <a href="https://anilist.co" target="_blank" rel="noreferrer">
          AniList
        </a>{' '}
        API and does not claim ownership of it. The AniHanko name, logo and site design belong to AlgoWanderer.
      </p>

      <h2>No guarantees</h2>
      <p>
        The site is provided "as is". Anime information comes from AniList and may be incomplete, out of date or
        wrong. The site may change, break or go offline at any time.
      </p>

      <h2>Use it fairly</h2>
      <p>
        Please don't use automated tools to scrape AniHanko or flood it with requests. This keeps it working for
        everyone and respects AniList's limits.
      </p>

      <h2>Links to other sites</h2>
      <p>
        AniHanko links to sites like AniList, MyAnimeList and YouTube. We are not responsible for their content or how
        they handle your data.
      </p>

      <h2>Privacy and changes</h2>
      <p>
        How data is handled is explained in the <Link to="/privacy">Privacy Policy</Link>. These terms may be updated
        from time to time; the date at the top shows the latest version.
      </p>
    </Prose>
  )
}

import { Prose } from '../components/Prose'

export function PrivacyPage() {
  return (
    <Prose title="Privacy Policy" updated="November 7, 2026">
      <p>
        AniHanko is a small personal project for browsing anime. This page explains, in plain words, what happens to
        your data when you use it. The short version: AniHanko itself collects nothing about you.
      </p>

      <h2>What AniHanko does not do</h2>
      <ul>
        <li>No accounts, sign-ups or forms. We never ask for your name, email or anything else.</li>
        <li>No analytics, tracking or advertising.</li>
        <li>No cookies set by AniHanko.</li>
      </ul>

      <h2>What is saved on your device</h2>
      <p>
        If you pick a theme (light, dark or sea), your choice is saved in your browser's local storage so the site
        remembers it next time. Anime you stamp as watched (your Stamp book) are saved the same way. Both stay on your
        device and are never sent anywhere. Clearing your browser's site data removes them, so use "Download backup" on
        the Stamp book page if you want to keep your stamps.
      </p>

      <h2>Outside services the site uses</h2>
      <p>
        To show anime information, your browser connects directly to a few outside services. Like any website, they
        can see your IP address and basic browser details when it does. Each has its own privacy policy.
      </p>
      <ul>
        <li>
          <strong>AniList</strong> provides all anime data and images.{' '}
          <a href="https://anilist.co/terms" target="_blank" rel="noreferrer">
            AniList's terms and privacy
          </a>
        </li>
        <li>
          <strong>Google Fonts</strong> provides the fonts the site uses.{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
            Google's privacy policy
          </a>
        </li>
        <li>
          <strong>YouTube</strong> plays trailers on anime pages. We use YouTube's privacy-enhanced mode, but YouTube
          may store data once you press play.{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
            Google's privacy policy
          </a>
        </li>
        <li>
          <strong>Our hosting provider</strong> may keep standard server logs (such as IP addresses and pages
          requested) to keep the site running and secure.
        </li>
      </ul>

      <h2>Changes</h2>
      <p>
        If AniHanko ever adds features that collect data, such as accounts or watch lists, this page will be updated
        before they go live, and the date at the top will change.
      </p>
    </Prose>
  )
}

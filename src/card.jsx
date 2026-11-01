import { useEffect, useState } from 'react';
import './card.css';

const FOLLOWING_STORAGE_KEY = 'people-to-know-following';

const bios = [
  'Curious about the world, happiest when learning something new and sharing it with good people.',
  'Building meaningful things, finding inspiration in everyday moments, and always up for a new idea.',
  'A creative spirit who believes the best stories begin with a conversation.',
  'Big on thoughtful design, good coffee, and making time for the things that matter.',
  'Exploring new places and perspectives, one interesting connection at a time.',
];

const skillSets = [
  ['Creative thinking', 'Communication', 'Photography'],
  ['Product design', 'Strategy', 'Writing'],
  ['Leadership', 'Research', 'Collaboration'],
  ['Technology', 'Problem solving', 'Illustration'],
  ['Community', 'Storytelling', 'Planning'],
];

function readFollowingState() {
  try {
    const saved = localStorage.getItem(FOLLOWING_STORAGE_KEY);
    const ids = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
      return { ids: [], error: 'Saved follow data was invalid and has been reset.' };
    }
    return { ids, error: '' };
  } catch {
    return { ids: [], error: 'Saved follow data could not be read in this browser.' };
  }
}

function getProfileDetails(uuid) {
  const hash = Array.from(uuid).reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    7,
  );
  const hue = hash % 360;

  return {
    bio: bios[hash % bios.length],
    skills: skillSets[(hash >>> 5) % skillSets.length],
    followers: 1200 + (hash % 3901),
    cover: {
      backgroundImage: `linear-gradient(125deg, hsl(${hue} 72% 45%), hsl(${(hue + 72 + ((hash >>> 9) % 70)) % 360} 68% 63%))`,
    },
  };
}

export default function Card() {
  const [users, setUsers] = useState([]);
  const [savedFollowing] = useState(readFollowingState);
  const [following, setFollowing] = useState(() => new Set(savedFollowing.ids));
  const [openMessageId, setOpenMessageId] = useState(null);
  const [messageDrafts, setMessageDrafts] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const storageWarning = savedFollowing.error;

  useEffect(() => {
    const controller = new AbortController();

    async function loadUsers() {
      try {
        const response = await fetch('https://randomuser.me/api/?results=5&seed=people-to-know', {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Unable to load profiles. Please try again.');
        }

        const result = await response.json();
        if (!Array.isArray(result.results)) {
          throw new Error('The profile service returned an unexpected response.');
        }
        setUsers(result.results);
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setError('Unable to load profiles. Please check your connection and try again.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadUsers();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(FOLLOWING_STORAGE_KEY, JSON.stringify([...following]));
    } catch (storageError) {
      console.error('Follow changes could not be saved in this browser.', storageError);
    }
  }, [following]);

  function toggleFollow(id) {
    setFollowing((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleMessage(id) {
    setOpenMessageId((current) => (current === id ? null : id));
  }

  function renderMessageComposer(user) {
    const id = user.login.uuid;
    if (openMessageId !== id) {
      return null;
    }

    return (
      <div
        className="message-composer"
        id={`message-${id}`}
        onClick={(event) => event.stopPropagation()}
      >
        <label htmlFor={`message-text-${id}`}>
          Write a message to {user.name.first}
        </label>
        <textarea
          id={`message-text-${id}`}
          value={messageDrafts[id] ?? ''}
          onChange={(event) => {
            const message = event.target.value;
            setMessageDrafts((current) => ({ ...current, [id]: message }));
          }}
          placeholder="Write your message here..."
          rows="3"
        />
        <button
          className="message-close"
          type="button"
          onClick={() => setOpenMessageId(null)}
        >
          Close
        </button>
      </div>
    );
  }

  function renderProfileActions(user, isFollowing) {
    const id = user.login.uuid;
    const isMessageOpen = openMessageId === id;

    return (
      <>
        <div className="profile-actions">
          <button
            className={`button ${isFollowing ? 'button-following' : 'button-primary'}`}
            type="button"
            aria-pressed={isFollowing}
            onClick={() => toggleFollow(id)}
          >
            {isFollowing ? 'Unfollow' : 'Follow'}
          </button>
          <button
            className="button button-secondary"
            type="button"
            aria-expanded={isMessageOpen}
            aria-controls={`message-${id}`}
            onClick={() => toggleMessage(id)}
          >
            Message
          </button>
        </div>
        {renderMessageComposer(user)}
      </>
    );
  }

  const selectedUser = users.find((user) => user.login.uuid === selectedUserId);

  return (
    <main className="profiles-page">
      <header className="page-header">
        <p className="eyebrow">MEET YOUR COMMUNITY</p>
        <h1>People to know</h1>
        <p className="page-description">
          Discover new faces and start a conversation.
        </p>
      </header>

      {storageWarning && (
        <p className="status-message storage-warning" role="status">{storageWarning}</p>
      )}
      {loading && <p className="status-message" role="status">Finding profiles...</p>}
      {error && <p className="status-message error-message" role="alert">{error}</p>}

      {!loading && !error && selectedUser && (() => {
        const id = selectedUser.login.uuid;
        const name = `${selectedUser.name.first} ${selectedUser.name.last}`;
        const isFollowing = following.has(id);
        const details = getProfileDetails(id);

        return (
          <section className="profile-detail" aria-label={`${name}'s profile`}>
            <button
              className="back-button"
              type="button"
              onClick={() => setSelectedUserId(null)}
            >
              <span aria-hidden="true">←</span> Back to profiles
            </button>
            <div className="detail-card">
              <div className="detail-cover" style={details.cover} />
              <div className="detail-content">
                <img
                  className="detail-photo"
                  src={selectedUser.picture.large}
                  alt={name}
                />
                <div className="detail-heading">
                  <div>
                    <h2>{name}</h2>
                    <p className="profile-location">
                      {selectedUser.location.city}, {selectedUser.location.country}
                    </p>
                  </div>
                  <p className="follower-count">
                    <strong>{(details.followers + Number(isFollowing)).toLocaleString()}</strong>
                    <span>followers</span>
                  </p>
                </div>
                <div className="detail-section">
                  <h3>About</h3>
                  <p className="profile-bio">{details.bio}</p>
                </div>
                <div className="detail-section">
                  <h3>Skills & interests</h3>
                  <ul className="skill-list">
                    {details.skills.map((skill) => <li key={skill}>{skill}</li>)}
                  </ul>
                </div>
                {renderProfileActions(selectedUser, isFollowing)}
              </div>
            </div>
          </section>
        );
      })()}

      {!loading && !error && !selectedUser && (
        <section className="profile-grid" aria-label="Suggested profiles">
          {users.map((user) => {
            const id = user.login.uuid;
            const name = `${user.name.first} ${user.name.last}`;
            const isFollowing = following.has(id);
            const details = getProfileDetails(id);

            return (
              <article className="profile-card" key={id}>
                <button
                  className="profile-card-open"
                  type="button"
                  aria-label={`View ${name}'s profile`}
                  onClick={() => setSelectedUserId(id)}
                />
                <div className="card-cover" style={details.cover} />
                <img
                  className="profile-photo"
                  src={user.picture.large}
                  alt={name}
                  loading="lazy"
                />
                <div className="profile-info">
                  <h2>{name}</h2>
                  <p className="profile-location">
                    {user.location.city}, {user.location.country}
                  </p>
                  <p className="card-bio">{details.bio}</p>
                  <ul className="skill-list card-skills">
                    {details.skills.slice(0, 2).map((skill) => <li key={skill}>{skill}</li>)}
                  </ul>
                  <p className="card-followers">
                    <strong>{(details.followers + Number(isFollowing)).toLocaleString()}</strong>
                    {' '}followers
                  </p>
                </div>
                {renderProfileActions(user, isFollowing)}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

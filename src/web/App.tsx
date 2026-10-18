import { useState } from 'react';
import { LibraryPage } from './pages/LibraryPage';
import { OutlinePage } from './pages/OutlinePage';
import { DraftsPage } from './pages/DraftsPage';

type Page = 'library' | 'outline' | 'drafts';

export function App() {
  const [page, setPage] = useState<Page>('library');
  const [activeCaseStudyId, setActiveCaseStudyId] = useState<string | null>(null);

  return (
    <div className="app">
      <header className="app-header">
        <h1>ScreenStudy</h1>
        <nav>
          <button className={page === 'library' ? 'active' : ''} onClick={() => setPage('library')}>
            Media Library
          </button>
          <button className={page === 'outline' ? 'active' : ''} onClick={() => setPage('outline')}>
            Case Studies
          </button>
          <button
            className={page === 'drafts' ? 'active' : ''}
            onClick={() => setPage('drafts')}
            disabled={!activeCaseStudyId}
            title={activeCaseStudyId ? '' : 'Select a case study first'}
          >
            Drafts &amp; Publishing
          </button>
        </nav>
      </header>
      <main>
        {page === 'library' && <LibraryPage />}
        {page === 'outline' && (
          <OutlinePage
            activeCaseStudyId={activeCaseStudyId}
            onSelectCaseStudy={setActiveCaseStudyId}
          />
        )}
        {page === 'drafts' && activeCaseStudyId && (
          <DraftsPage caseStudyId={activeCaseStudyId} />
        )}
      </main>
    </div>
  );
}

import { FormEvent, useMemo, useState } from 'react'
import './App.css'

type CaptureType = 'note' | 'screenshot' | 'video' | 'audio' | 'link'

type DraftState = {
  title: string
  details: string
  type: CaptureType
}

type InboxEntry = {
  id: string
  title: string
  details: string
  type: CaptureType
  createdAt: string
}

type PortfolioDraft = {
  weekStart: string
  problem: string
  decisions: string
  outcomes: string
  impact: string
  lowConfidenceFlags: string[]
}

type PublishConfig = {
  owner: string
  repo: string
  baseBranch: string
  contentDirectory: string
  githubToken: string
  approvedBy: string
  authorName: string
  authorEmail: string
}

type PersistedPublishConfig = Omit<PublishConfig, 'githubToken'>

type PersistedAppState = {
  version: 2
  entries: InboxEntry[]
  draft: DraftState
  selectedWeekStart: string
  portfolioDraft: PortfolioDraft | null
  reviewApproved: boolean
  draftVersion: number
  publishConfig: PersistedPublishConfig
}

type LegacyPersistedState = {
  version: 1
  entries: InboxEntry[]
  draft: DraftState
}

type PublishStatus = 'idle' | 'running' | 'success' | 'error'

type PublishResult = {
  status: PublishStatus
  message: string
  steps: string[]
  prUrl?: string
}

type MarkdownArtifact = {
  filename: string
  markdown: string
  slug: string
  title: string
}

type GitHubRefResponse = {
  object: {
    sha: string
  }
}

type GitHubFileResponse = {
  content: {
    path: string
    sha: string
  }
}

type GitHubPullRequestResponse = {
  html_url: string
}

type InitialState = {
  entries: InboxEntry[]
  draft: DraftState
  selectedWeekStart: string
  portfolioDraft: PortfolioDraft | null
  reviewApproved: boolean
  draftVersion: number
  publishConfig: PersistedPublishConfig
  error: string | null
}

const STORAGE_KEY = 'screenstudy.quick-capture.v2'
const LEGACY_STORAGE_KEY = 'screenstudy.quick-capture.v1'

const defaultDraft: DraftState = {
  title: '',
  details: '',
  type: 'note',
}

const defaultPublishConfig: PublishConfig = {
  owner: '',
  repo: '',
  baseBranch: 'main',
  contentDirectory: 'content/case-studies',
  githubToken: '',
  approvedBy: 'human-reviewer',
  authorName: 'ScreenStudy Bot',
  authorEmail: 'screenstudy-bot@example.com',
}

const defaultPersistedPublishConfig: PersistedPublishConfig = {
  owner: defaultPublishConfig.owner,
  repo: defaultPublishConfig.repo,
  baseBranch: defaultPublishConfig.baseBranch,
  contentDirectory: defaultPublishConfig.contentDirectory,
  approvedBy: defaultPublishConfig.approvedBy,
  authorName: defaultPublishConfig.authorName,
  authorEmail: defaultPublishConfig.authorEmail,
}

const captureTypeLabels: Record<CaptureType, string> = {
  note: 'Note',
  screenshot: 'Screenshot',
  video: 'Video',
  audio: 'Audio',
  link: 'Link',
}

function getWeekStart(isoDate: string): Date {
  const date = new Date(isoDate)
  const weekday = (date.getDay() + 6) % 7
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - weekday)
  return date
}

function getEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`
}

function getDefaultInitialState(): InitialState {
  return {
    entries: [],
    draft: defaultDraft,
    selectedWeekStart: '',
    portfolioDraft: null,
    reviewApproved: false,
    draftVersion: 0,
    publishConfig: defaultPersistedPublishConfig,
    error: null,
  }
}

function readPersistedState(): InitialState {
  const rawState = window.localStorage.getItem(STORAGE_KEY)
  const fallbackState = getDefaultInitialState()

  if (rawState) {
    try {
      const parsedState = JSON.parse(rawState) as PersistedAppState
      if (parsedState.version !== 2) {
        throw new Error('Unsupported local storage schema version.')
      }

      return {
        entries: Array.isArray(parsedState.entries) ? parsedState.entries : [],
        draft: parsedState.draft ?? defaultDraft,
        selectedWeekStart: parsedState.selectedWeekStart ?? '',
        portfolioDraft: parsedState.portfolioDraft ?? null,
        reviewApproved: Boolean(parsedState.reviewApproved),
        draftVersion: Number.isFinite(parsedState.draftVersion) ? parsedState.draftVersion : 0,
        publishConfig: {
          ...defaultPersistedPublishConfig,
          ...parsedState.publishConfig,
        },
        error: null,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown storage error.'
      return {
        ...fallbackState,
        error: `Could not restore saved capture state: ${message}`,
      }
    }
  }

  const rawLegacyState = window.localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!rawLegacyState) {
    return fallbackState
  }

  try {
    const parsedLegacy = JSON.parse(rawLegacyState) as LegacyPersistedState
    if (parsedLegacy.version !== 1) {
      throw new Error('Unsupported legacy storage schema version.')
    }

    return {
      ...fallbackState,
      entries: Array.isArray(parsedLegacy.entries) ? parsedLegacy.entries : [],
      draft: parsedLegacy.draft ?? defaultDraft,
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown storage error.'
    return {
      ...fallbackState,
      error: `Could not restore saved capture state: ${message}`,
    }
  }
}

function buildPortfolioDraft(weekStart: string, weekEntries: InboxEntry[]): PortfolioDraft {
  const orderedEntries = [...weekEntries].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  )
  const titles = orderedEntries.map((entry) => entry.title)
  const detailsText = orderedEntries.map((entry) => entry.details).join(' ')
  const distinctTypes = new Set(orderedEntries.map((entry) => entry.type))

  const lowConfidenceFlags: string[] = []
  if (orderedEntries.length < 3) {
    lowConfidenceFlags.push('limited-evidence')
  }
  if (!/\d/.test(detailsText)) {
    lowConfidenceFlags.push('impact-metric-missing')
  }
  if (!distinctTypes.has('link')) {
    lowConfidenceFlags.push('supporting-links-missing')
  }

  const problem =
    titles.length > 0
      ? `This week focused on ${titles[0].toLowerCase()}${
          titles.length > 1 ? ` and ${titles[1].toLowerCase()}` : ''
        }, with the goal of moving the sprint toward publishable outcomes.`
      : 'The team needed to make measurable progress on the sprint objective.'

  const decisions = orderedEntries
    .map(
      (entry) =>
        `- ${captureTypeLabels[entry.type]} capture: ${entry.title}${
          entry.details ? ` — ${entry.details}` : ''
        }`,
    )
    .join('\n')

  const outcomes = `Captured ${orderedEntries.length} evidence item${
    orderedEntries.length === 1 ? '' : 's'
  } across ${distinctTypes.size} source type${
    distinctTypes.size === 1 ? '' : 's'
  }, ready for narrative drafting and review.`

  const impact =
    lowConfidenceFlags.length === 0
      ? 'Current evidence suggests the sprint is ready to move toward approval and publish preparation.'
      : 'Impact is directionally positive, but additional validation is needed in flagged low-confidence areas before final publish.'

  return {
    weekStart,
    problem,
    decisions,
    outcomes,
    impact,
    lowConfidenceFlags,
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function toYamlString(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`
}

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
}

function buildMarkdownArtifact(input: {
  draft: PortfolioDraft
  weekEntries: InboxEntry[]
  approvedBy: string
  draftVersion: number
}): MarkdownArtifact {
  const { draft, weekEntries, approvedBy, draftVersion } = input
  const titleSource = weekEntries[0]?.title ?? `Case Study ${draft.weekStart}`
  const title = titleSource.charAt(0).toUpperCase() + titleSource.slice(1)
  const slug = slugify(title) || `case-study-${draft.weekStart}`
  const summary = draft.problem.slice(0, 220)
  const createdAt = [...weekEntries]
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())[0]
    ?.createdAt
  const nowIso = new Date().toISOString()
  const safeCreatedAt = createdAt ?? nowIso

  const frontmatter = [
    '---',
    `title: ${toYamlString(title)}`,
    `slug: ${toYamlString(slug)}`,
    `summary: ${toYamlString(summary)}`,
    'status: "approved"',
    `created_at: ${toYamlString(safeCreatedAt)}`,
    `updated_at: ${toYamlString(nowIso)}`,
    `approved_at: ${toYamlString(nowIso)}`,
    `approved_by: ${toYamlString(approvedBy)}`,
    `source_sprint_id: ${toYamlString(`sprint-${draft.weekStart}`)}`,
    `draft_version: ${Math.max(1, draftVersion)}`,
    `evidence_count: ${weekEntries.length}`,
    'confidence_flags:',
    ...(draft.lowConfidenceFlags.length > 0
      ? draft.lowConfidenceFlags.map((flag) => `  - ${toYamlString(flag)}`)
      : ['  - "none"']),
    'tags:',
    '  - "ux-engineering"',
    '  - "screen-study"',
    '---',
  ].join('\n')

  const body = [
    `# ${title}`,
    '',
    '## Problem',
    draft.problem,
    '',
    '## Decisions',
    draft.decisions,
    '',
    '## Outcomes',
    draft.outcomes,
    '',
    '## Impact',
    draft.impact,
    '',
  ].join('\n')

  return {
    filename: `${slug}.md`,
    slug,
    title,
    markdown: `${frontmatter}\n\n${body}`,
  }
}

function getActionableHint(stage: string): string {
  switch (stage) {
    case 'config':
      return 'Fill owner, repo, token, and base branch in Publishing Adapter Config.'
    case 'approval':
      return 'Approve the draft in the review gate before running publish.'
    case 'branch':
      return 'Check repository permissions, base branch name, and whether the branch already exists.'
    case 'content':
      return 'Verify content path and token scope (repo contents:write).'
    case 'pull_request':
      return 'Confirm PR permissions and that base/head branches differ.'
    default:
      return 'Check the error details and fix the failing publish stage.'
  }
}

function App() {
  const initialState = useMemo(() => readPersistedState(), [])
  const [entries, setEntries] = useState<InboxEntry[]>(initialState.entries)
  const [draft, setDraft] = useState<DraftState>(initialState.draft)
  const [persistError, setPersistError] = useState<string | null>(initialState.error)
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(initialState.selectedWeekStart)
  const [portfolioDraft, setPortfolioDraft] = useState<PortfolioDraft | null>(initialState.portfolioDraft)
  const [reviewApproved, setReviewApproved] = useState(initialState.reviewApproved)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [publishConfig, setPublishConfig] = useState<PublishConfig>({
    ...defaultPublishConfig,
    ...initialState.publishConfig,
    githubToken: '',
  })
  const [draftVersion, setDraftVersion] = useState(initialState.draftVersion)
  const [publishResult, setPublishResult] = useState<PublishResult>({
    status: 'idle',
    message: '',
    steps: [],
  })
  const [markdownPreview, setMarkdownPreview] = useState('')

  function persistAppState(overrides?: Partial<PersistedAppState>): void {
    const stateToPersist: PersistedAppState = {
      version: 2,
      entries,
      draft,
      selectedWeekStart,
      portfolioDraft,
      reviewApproved,
      draftVersion,
      publishConfig: {
        owner: publishConfig.owner,
        repo: publishConfig.repo,
        baseBranch: publishConfig.baseBranch,
        contentDirectory: publishConfig.contentDirectory,
        approvedBy: publishConfig.approvedBy,
        authorName: publishConfig.authorName,
        authorEmail: publishConfig.authorEmail,
      },
      ...overrides,
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist))
      window.localStorage.removeItem(LEGACY_STORAGE_KEY)
      setPersistError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown storage error.'
      setPersistError(`Could not save capture state: ${message}`)
    }
  }

  function updateDraft(update: Partial<DraftState>): void {
    const nextDraft: DraftState = {
      ...draft,
      ...update,
    }

    setDraft(nextDraft)
    persistAppState({ draft: nextDraft })
  }

  const groupedEntries = useMemo(() => {
    const byWeek = new Map<string, InboxEntry[]>()

    entries.forEach((entry) => {
      const weekStart = getWeekStart(entry.createdAt).toISOString().slice(0, 10)
      const currentGroup = byWeek.get(weekStart) ?? []
      currentGroup.push(entry)
      byWeek.set(weekStart, currentGroup)
    })

    return Array.from(byWeek.entries())
      .map(([weekStart, weekEntries]) => ({
        weekStart,
        label: `Week of ${new Date(weekStart).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`,
        entries: weekEntries.sort(
          (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        ),
      }))
      .sort((left, right) => (left.weekStart < right.weekStart ? 1 : -1))
  }, [entries])

  const activeWeekStart =
    groupedEntries.find((group) => group.weekStart === selectedWeekStart)?.weekStart ??
    groupedEntries[0]?.weekStart ??
    ''

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    const normalizedTitle = draft.title.trim()
    if (!normalizedTitle) {
      setPersistError('Add at least a short title before continuing.')
      return
    }

    const nextEntry: InboxEntry = {
      id: getEntryId(),
      title: normalizedTitle,
      details: draft.details.trim(),
      type: draft.type,
      createdAt: new Date().toISOString(),
    }

    const nextEntries = [nextEntry, ...entries]
    const nextDraft: DraftState = {
      ...draft,
      title: '',
      details: '',
    }

    setEntries(nextEntries)
    setDraft(nextDraft)
    setPortfolioDraft(null)
    setReviewApproved(false)
    setPublishResult({ status: 'idle', message: '', steps: [] })
    setMarkdownPreview('')
    persistAppState({
      entries: nextEntries,
      draft: nextDraft,
      portfolioDraft: null,
      reviewApproved: false,
    })
  }

  function handleDelete(entryId: string): void {
    const nextEntries = entries.filter((entry) => entry.id !== entryId)
    setEntries(nextEntries)
    setPortfolioDraft(null)
    setReviewApproved(false)
    setPublishResult({ status: 'idle', message: '', steps: [] })
    setMarkdownPreview('')
    persistAppState({
      entries: nextEntries,
      portfolioDraft: null,
      reviewApproved: false,
    })
  }

  function handleGenerateDraft(): void {
    if (!activeWeekStart) {
      setDraftError('Add captures first so a weekly draft can be generated.')
      return
    }

    const weekGroup = groupedEntries.find((group) => group.weekStart === activeWeekStart)
    if (!weekGroup) {
      setDraftError('Selected week is no longer available. Choose a week and try again.')
      return
    }

    const nextPortfolioDraft = buildPortfolioDraft(activeWeekStart, weekGroup.entries)
    const nextDraftVersion = draftVersion + 1

    setPortfolioDraft(nextPortfolioDraft)
    setDraftVersion(nextDraftVersion)
    setReviewApproved(false)
    setDraftError(null)
    setPublishResult({ status: 'idle', message: '', steps: [] })
    setMarkdownPreview('')
    persistAppState({
      portfolioDraft: nextPortfolioDraft,
      draftVersion: nextDraftVersion,
      reviewApproved: false,
    })
  }

  function updatePortfolioSection(
    section: keyof Omit<PortfolioDraft, 'weekStart' | 'lowConfidenceFlags'>,
    value: string,
  ): void {
    if (!portfolioDraft) {
      return
    }

    const nextDraft: PortfolioDraft = {
      ...portfolioDraft,
      [section]: value,
    }

    setPortfolioDraft(nextDraft)
    setReviewApproved(false)
    persistAppState({
      portfolioDraft: nextDraft,
      reviewApproved: false,
    })
  }

  function handleWeekSelection(nextWeek: string): void {
    setSelectedWeekStart(nextWeek)
    persistAppState({ selectedWeekStart: nextWeek })
  }

  function handleReviewApprovalChange(nextApproved: boolean): void {
    setReviewApproved(nextApproved)
    persistAppState({ reviewApproved: nextApproved })
  }

  function updatePublishConfig(update: Partial<PublishConfig>): void {
    const nextConfig: PublishConfig = {
      ...publishConfig,
      ...update,
    }

    setPublishConfig(nextConfig)
    persistAppState({
      publishConfig: {
        owner: nextConfig.owner,
        repo: nextConfig.repo,
        baseBranch: nextConfig.baseBranch,
        contentDirectory: nextConfig.contentDirectory,
        approvedBy: nextConfig.approvedBy,
        authorName: nextConfig.authorName,
        authorEmail: nextConfig.authorEmail,
      },
    })
  }

  function getCurrentArtifact(): MarkdownArtifact | null {
    if (!portfolioDraft) {
      return null
    }

    const weekGroup = groupedEntries.find((group) => group.weekStart === portfolioDraft.weekStart)
    if (!weekGroup) {
      return null
    }

    return buildMarkdownArtifact({
      draft: portfolioDraft,
      weekEntries: weekGroup.entries,
      approvedBy: publishConfig.approvedBy.trim() || 'human-reviewer',
      draftVersion,
    })
  }

  function downloadMarkdown(): void {
    const artifact = getCurrentArtifact()
    if (!artifact) {
      setPublishResult({
        status: 'error',
        message: 'Cannot export markdown yet. Generate a draft first.',
        steps: ['Markdown export blocked: missing generated draft.'],
      })
      return
    }

    const blob = new Blob([artifact.markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = artifact.filename
    anchor.click()
    URL.revokeObjectURL(url)

    setMarkdownPreview(artifact.markdown)
    setPublishResult({
      status: 'success',
      message: `Markdown exported as ${artifact.filename}.`,
      steps: ['Frontmatter generated using Day 3 schema.', 'Markdown body generated with required narrative sections.'],
    })
  }

  async function githubRequest<T>(input: {
    path: string
    method?: 'GET' | 'POST' | 'PUT'
    token: string
    body?: Record<string, unknown>
  }): Promise<T> {
    const { path, method = 'GET', token, body } = input
    const response = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const payload = (await response.json().catch(() => null)) as { message?: string } | null
    if (!response.ok) {
      const detail = payload?.message ? ` ${payload.message}` : ''
      throw new Error(`GitHub API ${response.status} at ${path}.${detail}`)
    }

    return payload as T
  }

  async function runPublishFlow(dryRun: boolean): Promise<void> {
    const steps: string[] = []
    const artifact = getCurrentArtifact()
    if (!artifact) {
      setPublishResult({
        status: 'error',
        message: 'Generate a portfolio draft before running publish.',
        steps: ['Publish blocked at approval: missing draft artifact.'],
      })
      return
    }

    if (!reviewApproved) {
      setPublishResult({
        status: 'error',
        message: 'Review gate is required before publish.',
        steps: ['Stage: approval', getActionableHint('approval')],
      })
      return
    }

    const owner = publishConfig.owner.trim()
    const repo = publishConfig.repo.trim()
    const baseBranch = publishConfig.baseBranch.trim()
    const token = publishConfig.githubToken.trim()
    const contentDirectory = publishConfig.contentDirectory.trim().replace(/^\/+/, '').replace(/\/+$/, '')
    const authorName = publishConfig.authorName.trim() || 'ScreenStudy Bot'
    const authorEmail = publishConfig.authorEmail.trim() || 'screenstudy-bot@example.com'
    const approvedBy = publishConfig.approvedBy.trim() || 'human-reviewer'

    if (!owner || !repo || !baseBranch || !token) {
      setPublishResult({
        status: 'error',
        message: 'Missing publish configuration values.',
        steps: ['Stage: config', getActionableHint('config')],
      })
      return
    }

    const targetPath = contentDirectory ? `${contentDirectory}/${artifact.filename}` : artifact.filename
    steps.push(`Validated publish config for ${owner}/${repo} on base branch ${baseBranch}.`)
    steps.push(`Prepared markdown artifact at ${targetPath}.`)
    setPublishResult({
      status: 'running',
      message: dryRun ? 'Running dry run validation...' : 'Running GitHub publish flow...',
      steps,
    })

    setMarkdownPreview(artifact.markdown)

    if (dryRun) {
      setPublishResult({
        status: 'success',
        message: 'Dry run complete. Configuration and markdown artifact are ready for publish.',
        steps: [
          ...steps,
          'Dry run stops before branch/commit/PR side effects.',
          'Actionable next step: run "Create GitHub PR" with the same config.',
        ],
      })
      return
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const branchName = `screenstudy/${artifact.slug}-${timestamp}`
    try {
      const baseRef = await githubRequest<GitHubRefResponse>({
        path: `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
        token,
      })
      steps.push(`Resolved base branch ${baseBranch} at ${baseRef.object.sha.slice(0, 7)}.`)

      await githubRequest({
        path: `/repos/${owner}/${repo}/git/refs`,
        method: 'POST',
        token,
        body: {
          ref: `refs/heads/${branchName}`,
          sha: baseRef.object.sha,
        },
      })
      steps.push(`Created branch ${branchName}.`)

      const contentResponse = await githubRequest<GitHubFileResponse>({
        path: `/repos/${owner}/${repo}/contents/${targetPath}`,
        method: 'PUT',
        token,
        body: {
          message: `feat(content): add ${artifact.slug}`,
          content: toBase64(artifact.markdown),
          branch: branchName,
          committer: {
            name: authorName,
            email: authorEmail,
          },
        },
      })
      steps.push(`Committed markdown file ${contentResponse.content.path}.`)

      const prResponse = await githubRequest<GitHubPullRequestResponse>({
        path: `/repos/${owner}/${repo}/pulls`,
        method: 'POST',
        token,
        body: {
          title: `Publish case study: ${artifact.title}`,
          head: branchName,
          base: baseBranch,
          body: [
            'Generated by ScreenStudy Day 8 adapter.',
            '',
            `- Approved by: ${approvedBy}`,
            `- Draft version: ${Math.max(1, draftVersion)}`,
            `- Source sprint: sprint-${portfolioDraft?.weekStart ?? 'unknown'}`,
            `- Confidence flags: ${portfolioDraft?.lowConfidenceFlags.join(', ') || 'none'}`,
          ].join('\n'),
        },
      })
      steps.push(`Created pull request ${prResponse.html_url}.`)

      setPublishResult({
        status: 'success',
        message: 'Publish succeeded. Branch, commit, and PR were created.',
        steps,
        prUrl: prResponse.html_url,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown publish error.'
      let stage = 'unknown'
      if (message.includes('/git/ref/heads/')) {
        stage = 'branch'
      } else if (message.includes('/contents/')) {
        stage = 'content'
      } else if (message.includes('/pulls')) {
        stage = 'pull_request'
      }

      setPublishResult({
        status: 'error',
        message: `Publish failed at ${stage} stage: ${message}`,
        steps: [...steps, `Stage: ${stage}`, getActionableHint(stage)],
      })
    }
  }

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">ScreenStudy</p>
        <h1>Quick Capture Inbox</h1>
        <p className="hero-copy">
          Capture proof of work fast, keep it grouped by week, and progress to review-ready publishing.
        </p>
      </header>

      <section className="composer-section">
        <h2>Quick add</h2>
        <form className="capture-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Title</span>
            <input
              type="text"
              value={draft.title}
              onChange={(event) => updateDraft({ title: event.target.value })}
              placeholder="What happened?…"
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span>Details (optional)</span>
            <textarea
              value={draft.details}
              onChange={(event) => updateDraft({ details: event.target.value })}
              placeholder="Add context, outcomes, links, or next steps…"
              rows={4}
              spellCheck={false}
            />
          </label>

          <label className="field">
            <span>Capture type</span>
            <select
              value={draft.type}
              onChange={(event) => updateDraft({ type: event.target.value as CaptureType })}
            >
              {Object.entries(captureTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <button className="primary-button" type="submit">
            Add to inbox
          </button>
        </form>
        {persistError ? <p className="inline-error">{persistError}</p> : null}
      </section>

      <section className="queue-section">
        <h2>Weekly queue</h2>
        {groupedEntries.length === 0 ? (
          <div className="empty-state">
            <p>No captures yet. Add your first item above…</p>
          </div>
        ) : (
          groupedEntries.map((group) => (
            <article key={group.weekStart} className="week-group">
              <h3>{group.label}</h3>
              <ul className="entry-list">
                {group.entries.map((entry) => (
                  <li key={entry.id} className="entry-card">
                    <div className="entry-header">
                      <strong>{entry.title}</strong>
                      <span className="entry-type">{captureTypeLabels[entry.type]}</span>
                    </div>
                    {entry.details ? <p>{entry.details}</p> : null}
                    <div className="entry-footer">
                      <time dateTime={entry.createdAt}>
                        {new Date(entry.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </time>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => handleDelete(entry.id)}
                        aria-label={`Delete ${entry.title}`}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </section>

      <section className="portfolio-section">
        <h2>Portfolio Signal draft</h2>
        <label className="field">
          <span>Source week</span>
          <select value={activeWeekStart} onChange={(event) => handleWeekSelection(event.target.value)}>
            {groupedEntries.length === 0 ? (
              <option value="">No weekly captures available</option>
            ) : (
              groupedEntries.map((group) => (
                <option key={group.weekStart} value={group.weekStart}>
                  {group.label}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          type="button"
          className="primary-button"
          onClick={handleGenerateDraft}
          disabled={groupedEntries.length === 0}
        >
          Generate Portfolio Signal draft
        </button>
        {draftError ? <p className="inline-error">{draftError}</p> : null}

        {portfolioDraft ? (
          <>
            {portfolioDraft.lowConfidenceFlags.length > 0 ? (
              <div className="flag-block">
                <h3>Low-confidence markers</h3>
                <ul>
                  {portfolioDraft.lowConfidenceFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <label className="field">
              <span>Problem</span>
              <textarea
                value={portfolioDraft.problem}
                rows={4}
                onChange={(event) => updatePortfolioSection('problem', event.target.value)}
              />
            </label>

            <label className="field">
              <span>Decisions</span>
              <textarea
                value={portfolioDraft.decisions}
                rows={6}
                onChange={(event) => updatePortfolioSection('decisions', event.target.value)}
              />
            </label>

            <label className="field">
              <span>Outcomes</span>
              <textarea
                value={portfolioDraft.outcomes}
                rows={4}
                onChange={(event) => updatePortfolioSection('outcomes', event.target.value)}
              />
            </label>

            <label className="field">
              <span>Impact</span>
              <textarea
                value={portfolioDraft.impact}
                rows={4}
                onChange={(event) => updatePortfolioSection('impact', event.target.value)}
              />
            </label>

            <label className="review-gate">
              <input
                type="checkbox"
                checked={reviewApproved}
                onChange={(event) => handleReviewApprovalChange(event.target.checked)}
              />
              <span>I have reviewed this draft and approve it for publish action.</span>
            </label>
          </>
        ) : null}
      </section>

      <section className="publish-section">
        <h2>Publish adapter</h2>
        <p className="publish-copy">
          Day 8 output flow: export markdown, dry-run validation, and GitHub branch/commit/PR creation.
        </p>

        <div className="publish-grid">
          <label className="field">
            <span>GitHub owner</span>
            <input
              type="text"
              name="owner"
              value={publishConfig.owner}
              onChange={(event) => updatePublishConfig({ owner: event.target.value })}
              placeholder="org-or-user"
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span>Repository</span>
            <input
              type="text"
              name="repo"
              value={publishConfig.repo}
              onChange={(event) => updatePublishConfig({ repo: event.target.value })}
              placeholder="content-repo"
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span>Base branch</span>
            <input
              type="text"
              value={publishConfig.baseBranch}
              onChange={(event) => updatePublishConfig({ baseBranch: event.target.value })}
              placeholder="main"
            />
          </label>

          <label className="field">
            <span>Content directory</span>
            <input
              type="text"
              value={publishConfig.contentDirectory}
              onChange={(event) => updatePublishConfig({ contentDirectory: event.target.value })}
              placeholder="content/case-studies"
            />
          </label>

          <label className="field">
            <span>Approved by</span>
            <input
              type="text"
              value={publishConfig.approvedBy}
              onChange={(event) => updatePublishConfig({ approvedBy: event.target.value })}
              placeholder="human-reviewer"
            />
          </label>

          <label className="field">
            <span>Author name</span>
            <input
              type="text"
              name="authorName"
              value={publishConfig.authorName}
              onChange={(event) => updatePublishConfig({ authorName: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Author email</span>
            <input
              type="email"
              name="authorEmail"
              value={publishConfig.authorEmail}
              onChange={(event) => updatePublishConfig({ authorEmail: event.target.value })}
            />
          </label>

          <label className="field">
            <span>GitHub token</span>
            <input
              type="password"
              name="githubToken"
              value={publishConfig.githubToken}
              onChange={(event) => setPublishConfig((current) => ({ ...current, githubToken: event.target.value }))}
              placeholder="ghp_..."
              autoComplete="off"
            />
          </label>
        </div>

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={downloadMarkdown} disabled={!portfolioDraft}>
            Export markdown
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => runPublishFlow(true)}
            disabled={!portfolioDraft || publishResult.status === 'running'}
          >
            Publish dry run
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => runPublishFlow(false)}
            disabled={!portfolioDraft || publishResult.status === 'running'}
          >
            Create GitHub PR
          </button>
        </div>

        {publishResult.message ? (
          <p className={publishResult.status === 'error' ? 'inline-error' : 'success-note'}>{publishResult.message}</p>
        ) : null}

        {publishResult.steps.length > 0 ? (
          <ul className="result-list" aria-live="polite">
            {publishResult.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        ) : null}

        {publishResult.prUrl ? (
          <p className="pr-link">
            PR:{' '}
            <a href={publishResult.prUrl} target="_blank" rel="noreferrer">
              {publishResult.prUrl}
            </a>
          </p>
        ) : null}

        {markdownPreview ? (
          <details className="markdown-preview">
            <summary>Markdown preview</summary>
            <pre>{markdownPreview}</pre>
          </details>
        ) : null}
      </section>
    </main>
  )
}

export default App

# Day 1 Sign-Off: Contract Freeze

Date: 2026-06-27
Status: Approved for MVP implementation

## Locked persona

- **Primary user:** solo UX engineer, design engineer, or frontend/product-minded builder who wants to turn real shipped work into portfolio-ready case study content without maintaining a separate writing workflow during the week.

## Locked job to be done

- **When** I finish or make meaningful progress on product work,
- **I want to** quickly capture evidence, organize it into a coherent story, generate a strong first draft, and publish through a GitHub PR workflow,
- **so that** I can ship polished case study content with low context-switch cost and mandatory human review before anything goes live.

## Locked success metrics

1. A user can complete the full MVP flow of **Capture -> Organize -> Draft -> Publish** with human review enforced before publish.
2. Pilot median completion time from raw inputs to publish-ready PR is **30 minutes or less**, or an explicit remediation backlog is recorded.
3. Every draft produced for publish contains the narrative spine of **problem, decisions, outcomes, and impact**.
4. **100%** of publish attempts require an explicit human approval action before any branch, commit, or PR is created.

## Frozen scope

The MVP is limited to the following:

1. A **4-step Publish Sprint Wizard** covering Capture, Organize, Draft, and Publish.
2. **Portfolio Signal Mode** as the drafting structure for turning evidence into a case-study narrative.
3. **Markdown export** as the publish artifact.
4. A single **GitHub PR adapter** that creates a branch, commit, and pull request in the target content repository.
5. A **mandatory human review gate** before any publish action is allowed to execute.

## Frozen non-goals

The following are explicitly out of scope for the MVP:

1. Team collaboration workflows, shared editing, or multi-user review states.
2. Multiple publishing adapters or simultaneous publish destinations.
3. Autonomous publishing without human review.
4. Non-markdown publish outputs as a required MVP path.
5. General-purpose project management, asset management, or CMS replacement workflows.

## Step-level acceptance criteria

### 1. Capture

- The user can add raw evidence for a work item with a low-friction, interruption-safe input flow.
- The step accepts the MVP capture inputs needed to proceed into organization without requiring final article structure decisions.
- Captured items persist so a user can leave and resume without data loss.
- The primary CTA advances only after at least one usable work artifact or note exists in the sprint being prepared.

### 2. Organize

- The user can review captured inputs in one place and group them into a single publishable story for the current sprint.
- The step produces an ordered set of supporting evidence that downstream drafting can consume.
- The user can identify the main thread of the story and exclude irrelevant noise before drafting.
- The primary CTA advances only when the draft input set is coherent enough to generate a narrative from it.

### 3. Draft

- The system generates a draft using **Portfolio Signal Mode**.
- The draft structure includes, at minimum, **problem, decisions, outcomes, and impact**.
- Low-confidence or weak-evidence sections are visibly marked for human attention.
- The user can revise or regenerate the draft before entering the publish step.
- The primary CTA advances only when a draft exists and is ready for explicit human review.

### 4. Publish

- The user must complete an explicit approval action before any publish operation runs.
- The system can export valid markdown with the required frontmatter for the content repository.
- The GitHub adapter can create a branch, commit, and PR for the approved draft, or run in dry-run mode with actionable errors.
- No publish side effect occurs if approval is missing, export fails, or the adapter returns an error.

## Sign-off statement

Day 1 contract freeze is complete. Persona, JTBD, scope, non-goals, success metrics, and step-level acceptance criteria are now fixed for MVP implementation unless an explicit change decision is recorded.

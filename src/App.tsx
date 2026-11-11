import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  Compass,
  Download,
  Globe2,
  GraduationCap,
  Info,
  MapPin,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  X,
  GitCompareArrows,
  CalendarDays,
} from 'lucide-react';
import countries from '../data/countries.json';
import { Brand, GradScapeMark, IntakeIllustration } from './Brand';
import {
  programmes,
  cityName,
  months,
  initialFilters,
  filterProgrammes,
  tuitionRange,
  changeFilterCurrency,
  money,
  convert,
  fullFee,
  nextIntake,
  intakeLabel,
  reviewReasons,
  toggleSelection,
  parseBackup,
  download,
  defaultPriorities,
  prioritiesSchema,
  matchReasons,
} from './lib';
import type { Filters, Priorities } from './lib';
import { statuses } from './schema';
import type { Backup, Programme } from './schema';

type Page = 'explore' | 'compare' | 'shortlist' | 'priorities';
function useStored<T>(key: string, initial: T, validate: (v: unknown) => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? validate(JSON.parse(raw)) : initial;
    } catch {
      return initial;
    }
  });
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setError('');
    } catch {
      setError('Device storage is unavailable or full. Export a backup to keep your changes.');
    }
  }, [key, value]);
  return [value, setValue, error] as const;
}
function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="select-wrap">
        <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
          {children}
        </select>
        <ChevronDown size={14} />
      </span>
    </label>
  );
}
function Intake({ p }: { p: Programme }) {
  const i = nextIntake(p);
  return (
    <span className="intake">
      <span className={`intake-dot ${i?.status === 'confirmed' ? 'confirmed' : ''}`} />
      <span>
        {intakeLabel(i)}
        <small>
          {i?.status === 'confirmed' ? 'Confirmed' : i ? 'To confirm' : 'Ask admissions'}
        </small>
      </span>
    </span>
  );
}
function ProviderMark({ p }: { p: Programme }) {
  const initials =
    p.institution === 'University of Auckland'
      ? 'UA'
      : p.institution === 'Auckland University of Technology'
        ? 'AUT'
        : p.institution === 'University of Canterbury'
          ? 'UC'
          : p.institution === 'Victoria University of Wellington'
            ? 'VW'
            : p.institution
                .split(' ')
                .filter((w) => !['of', 'and', 'the'].includes(w))
                .slice(0, 2)
                .map((w) => w[0])
                .join('');
  return (
    <span
      aria-hidden="true"
      className={`provider-mark ${p.providerType === 'University' ? 'university' : 'poly'}`}
    >
      <GraduationCap size={18} />
      <b>{initials}</b>
    </span>
  );
}
function Timeline({ rows, year }: { rows: Programme[]; year: string }) {
  return (
    <div className="timeline-scroll">
      <div className="timeline">
        <div className="timeline-head">
          <b>{year} intakes</b>
          {months.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
        {rows.map((p) => (
          <div className="timeline-row" key={p.id}>
            <div>
              <strong>{p.institution}</strong>
              <small>{p.title}</small>
            </div>
            {months.map((m, index) => {
              const starts = p.intakes.filter((i) =>
                i.date?.startsWith(`${year}-${String(index + 1).padStart(2, '0')}`),
              );
              return (
                <div className="month-cell" key={m}>
                  {starts.map((i, n) => (
                    <span
                      key={n}
                      tabIndex={0}
                      className={`timeline-marker ${i.status}`}
                      title={`${intakeLabel(i)} · ${i.status}`}
                      aria-label={`${p.title}: ${intakeLabel(i)}, ${i.status}`}
                    >
                      {i.precision === 'day' ? i.date?.slice(8) : m}
                      <span className="sr-only"> {i.status}</span>
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
        {rows
          .filter(
            (p) =>
              p.intakes.some((i) => !i.date) || !p.intakes.some((i) => i.date?.startsWith(year)),
          )
          .map((p) => (
            <p className="unknown-start" key={p.id}>
              <span className="unknown-dot">?</span> {p.institution} · {p.title}:{' '}
              {p.intakes.some((i) => !i.date)
                ? 'Start unknown — ask admissions'
                : `No known starts in ${year}`}
            </p>
          ))}
      </div>
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const prev = document.activeElement as HTMLElement;
    return () => {
      prev?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Fee({
  p,
  rates,
  currency,
}: {
  p: Programme;
  rates: Record<string, number>;
  currency: string;
}) {
  const converted = convert(p.fee.amount, p.fee.currency, currency, rates);
  const isConverted = currency !== p.fee.currency;
  const secondaryCurrency = isConverted ? p.fee.currency : currency === 'NZD' ? 'INR' : 'NZD';
  const secondaryAmount = isConverted
    ? p.fee.amount
    : convert(p.fee.amount, p.fee.currency, secondaryCurrency, rates);
  return (
    <div className="fee">
      <strong>
        {money(converted, currency)}
        {isConverted && converted !== null ? ' est.' : ''}
      </strong>
      <small>
        {money(secondaryAmount, secondaryCurrency)}
        {isConverted ? ' original' : secondaryAmount !== null ? ' est.' : ''}
      </small>
      <span className={`tag ${p.fee.label === 'Published' ? 'green' : ''}`}>
        {p.fee.scope === 'annual'
          ? 'Annual only'
          : p.fee.scope === 'partial'
            ? 'Partial quote'
            : p.fee.label}
      </span>
      <small>
        {p.fee.scope === 'full'
          ? 'Full programme'
          : p.fee.scope === 'annual'
            ? 'Per year'
            : 'Excluded from full tuition'}{' '}
        · {p.fee.year ?? 'Year unconfirmed'}
      </small>
    </div>
  );
}
export default function App() {
  const route = () => {
    const v = location.hash.slice(1).split('?')[0];
    return ['explore', 'compare', 'shortlist', 'priorities'].includes(v) ? (v as Page) : 'explore';
  };
  const [page, setPage] = useState<Page>(route);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [page]);
  const [displayCurrency, setDisplayCurrency, currencyError] = useStored<string>(
    'sac-display-currency-v1',
    'NZD',
    (value) => {
      if (value !== 'NZD' && value !== 'INR') throw new Error('Unsupported display currency');
      return value;
    },
  );
  const [filters, setFilters] = useState<Filters>({ ...initialFilters, currency: displayCurrency });
  const [selected, setSelected] = useState<string[]>(() => {
    const shared = new URLSearchParams(location.hash.split('?')[1] ?? '').get('ids');
    let ids: unknown = [];
    try {
      ids = shared
        ? shared.split(',')
        : JSON.parse(sessionStorage.getItem('sac-comparison-v1') ?? '[]');
    } catch {
      /* Start fresh when session storage is unavailable. */
    }
    return Array.isArray(ids)
      ? [...new Set(ids)]
          .filter(
            (id): id is string => typeof id === 'string' && programmes.some((p) => p.id === id),
          )
          .slice(0, 4)
      : [];
  });
  useEffect(() => {
    try {
      sessionStorage.setItem('sac-comparison-v1', JSON.stringify(selected));
    } catch {
      /* Sharing public IDs remains available without session storage. */
    }
  }, [selected]);
  const [backup, setBackup, storageError] = useStored<Backup>(
    'sac-shortlist-v1',
    { version: 1, items: [] },
    parseBackup,
  );
  const [priorities, setPriorities, priorityError] = useStored<Priorities>(
    'sac-priorities-v1',
    defaultPriorities,
    (v) => prioritiesSchema.parse(v),
  );
  const [rate, setRate, rateError] = useStored<number>('sac-nzd-inr-v1', 52.9, (v) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) throw Error();
    return v;
  });
  const rates: Record<string, number> = { NZD: rate, INR: 1 };
  const [details, setDetails] = useState<Programme | null>(null);
  const [settings, setSettings] = useState(false);
  const [restore, setRestore] = useState<Backup | null>(null);
  const [notice, setNotice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [timelineYear, setTimelineYear] = useState('2027');
  const [living, setLiving] = useState('');
  const restoreInput = useRef<HTMLInputElement>(null);
  const go = (v: Page) => {
    location.hash = v;
    setPage(v);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  useEffect(() => {
    const onHash = () => {
      setPage(route());
      const ids = new URLSearchParams(location.hash.split('?')[1] ?? '').get('ids');
      if (ids !== null)
        setSelected(
          [...new Set(ids.split(','))]
            .filter((id) => programmes.some((p) => p.id === id))
            .slice(0, 4),
        );
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const update = (key: keyof Filters, value: string | boolean) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const changeCurrency = (currency: string) => {
    const next = changeFilterCurrency(filters, currency, rates);
    const nextLiving =
      living === '' ? null : convert(Number(living), filters.currency, currency, rates);
    if (next === null || (living !== '' && nextLiving === null)) {
      setNotice('Add an exchange rate before converting your budget and living costs.');
      return;
    }
    setFilters(next);
    setDisplayCurrency(currency);
    if (nextLiving !== null) setLiving(String(nextLiving));
  };
  const results = filterProgrammes(programmes, filters, rates);
  const countryRows = programmes.filter((p) => p.country === filters.country);
  const budgetRange = tuitionRange(countryRows, filters.currency, rates);
  const compareRows = selected.map((id) => programmes.find((p) => p.id === id)!);
  const savedIds = backup.items.map((i) => i.id);
  const save = (id: string) => {
    setBackup((b) => ({
      ...b,
      items: b.items.some((i) => i.id === id)
        ? b.items.filter((i) => i.id !== id)
        : [...b.items, { id, notes: '', status: 'To review' }],
    }));
  };
  const select = (id: string) => {
    if (selected.length === 4 && !selected.includes(id)) {
      setNotice('You can compare up to four programmes. Remove one to add another.');
      return;
    }
    setSelected((s) => toggleSelection(s, id));
  };
  const reset = () =>
    setFilters({ ...initialFilters, country: filters.country, currency: filters.currency });
  const options = (field: 'campuses' | 'providerType' | 'studyArea') =>
    [
      ...new Set(
        countryRows.flatMap((p) => (field === 'campuses' ? p.campuses.map(cityName) : p[field])),
      ),
    ].sort();
  const share = async () => {
    const url = new URL(location.href);
    url.search = '';
    url.hash = `compare?ids=${selected.join(',')}`;
    try {
      await navigator.clipboard.writeText(url.toString());
      setNotice('Comparison link copied. Only public programme IDs are included.');
    } catch {
      setNotice(url.toString());
    }
  };
  const fileRestore = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw Error('Backup is too large (maximum 2 MB).');
      setRestore(parseBackup(JSON.parse(await file.text())));
    } catch (e) {
      setNotice(`Invalid backup: ${e instanceof Error ? e.message : 'Could not read JSON'}`);
    }
    if (restoreInput.current) restoreInput.current.value = '';
  };
  const filterPanel = (
    <>
      <div className="filter-title">
        <h2>
          <SlidersHorizontal size={16} /> Refine your search
        </h2>
        <button className="text-button" onClick={reset}>
          Reset all
        </button>
      </div>
      <Select label="City / campus" value={filters.city} onChange={(v) => update('city', v)}>
        <option value="">All cities</option>
        {options('campuses').map((x) => (
          <option key={x}>{x}</option>
        ))}
      </Select>
      <div className="filter-divider" />
      <div className="field-title">Your next intake</div>
      <div className="field-pair">
        <Select label="Month" value={filters.month} onChange={(v) => update('month', v)}>
          <option value="">Any month</option>
          {months.map((m, i) => (
            <option key={m} value={String(i + 1).padStart(2, '0')}>
              {m}
            </option>
          ))}
        </Select>
        <Select label="Year" value={filters.year} onChange={(v) => update('year', v)}>
          <option value="">Any year</option>
          {[
            ...new Set(
              programmes.flatMap((p) => p.intakes.map((i) => i.date?.slice(0, 4)).filter(Boolean)),
            ),
          ]
            .sort()
            .map((y) => (
              <option key={y}>{y}</option>
            ))}
        </Select>
      </div>
      <p className="helper">
        Includes dates that need confirmation. Unknown starts appear with “Any year”.
      </p>
      <div className="filter-divider" />
      <Select
        label="Provider type"
        value={filters.provider}
        onChange={(v) => update('provider', v)}
      >
        <option value="">All providers</option>
        {options('providerType').map((x) => (
          <option key={x}>{x}</option>
        ))}
      </Select>
      <Select label="Study area" value={filters.area} onChange={(v) => update('area', v)}>
        <option value="">All study areas</option>
        {options('studyArea').map((x) => (
          <option key={x}>{x}</option>
        ))}
      </Select>
      <div className="filter-divider" />
      <fieldset className="tuition-budget">
        <legend>Maximum full tuition ({filters.currency})</legend>
        <div className="budget-value-row">
          <output htmlFor="tuition-slider tuition-amount">
            {filters.budget === '' ? 'No maximum' : money(Number(filters.budget), filters.currency)}
          </output>
          {filters.budget !== '' && (
            <button className="text-button" onClick={() => update('budget', '')}>
              No maximum
            </button>
          )}
        </div>
        <input
          id="tuition-slider"
          className="budget-slider"
          type="range"
          aria-label={`Maximum full tuition slider (${filters.currency})`}
          aria-describedby="tuition-range-help"
          aria-valuetext={
            filters.budget === '' ? 'No maximum' : money(Number(filters.budget), filters.currency)
          }
          min={0}
          max={budgetRange?.max ?? 1}
          step="any"
          disabled={budgetRange === null}
          value={Math.min(Number(filters.budget || budgetRange?.max || 0), budgetRange?.max ?? 1)}
          onChange={(e) => update('budget', String(Math.round(Number(e.target.value))))}
        />
        <div className="budget-range-labels" aria-hidden="true">
          <span>{money(0, filters.currency)}</span>
          <span>{budgetRange ? money(budgetRange.max, filters.currency) : 'Unavailable'}</span>
        </div>
        <label className="field budget-exact">
          <span>Or enter an exact maximum ({filters.currency})</span>
          <input
            id="tuition-amount"
            type="number"
            min="0"
            step="any"
            placeholder="No maximum"
            value={filters.budget}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0))
                update('budget', value);
            }}
          />
        </label>
        <p className="helper" id="tuition-range-help">
          {budgetRange
            ? 'Drag to explore, or type a precise budget.'
            : 'No comparable full-tuition quotes in this currency yet.'}
        </p>
      </fieldset>
      <p className="helper">
        Annual and partial quotes are excluded.{' '}
        {filters.currency === 'INR'
          ? `NZD converted at ${rate} INR per NZD.`
          : 'Original NZD amounts; no conversion.'}
      </p>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={filters.review}
          onChange={(e) => update('review', e.target.checked)}
        />
        <span>
          Needs review<small>Unverified fees or intakes</small>
        </span>
      </label>
    </>
  );
  return (
    <>
      <header className="header">
        <div className="header-inner">
          <a
            className="brand"
            href="#explore"
            aria-label="GradScape home"
            onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}
          >
            <Brand />
          </a>
          <nav aria-label="Main navigation">
            {(
              [
                { id: 'explore', label: 'Explore', icon: Compass },
                { id: 'compare', label: 'Compare', icon: GitCompareArrows },
                { id: 'shortlist', label: 'My shortlist', icon: Bookmark },
                { id: 'priorities', label: 'My priorities', icon: Settings2 },
              ] as const
            ).map((n) => (
              <a key={n.id} href={`#${n.id}`} className={page === n.id ? 'active' : ''}>
                <n.icon size={17} />
                {n.label}
                {n.id === 'shortlist' && backup.items.length > 0 && (
                  <span className="nav-count">{backup.items.length}</span>
                )}
              </a>
            ))}
          </nav>
          <div className="header-tools">
            <div className="display-currency">
              <Select label="Display currency" value={filters.currency} onChange={changeCurrency}>
                <option value="NZD">NZD</option>
                <option value="INR">INR</option>
              </Select>
            </div>
          </div>
        </div>
      </header>
      <main>
        {page === 'explore' && (
          <>
            <section className="intro">
              <div className="intro-copy">
                <div className="eyebrow">
                  <span className="edition-dot" /> THE MASTER’S FINDER / EST. 2026
                </div>
                <h1>
                  A master’s.
                  <br />
                  <span>A change of scene.</span>
                </h1>
                <p>
                  The courses. The costs. The calendar.
                  <br />
                  Find the master’s that makes sense for you.
                </p>
              </div>
              <IntakeIllustration />
            </section>
            <div className="search-bar">
              <div className="country-select">
                <Globe2 size={19} />
                <Select
                  label="Country"
                  value={filters.country}
                  onChange={(v) => {
                    setFilters((f) => ({ ...initialFilters, country: v, currency: f.currency }));
                  }}
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ·{' '}
                      {programmes.filter((p) => p.country === c.code).length || 'Coming soon'}
                    </option>
                  ))}
                </Select>
              </div>
              <label className="search-input">
                <Search size={20} />
                <input
                  aria-label="Search programmes"
                  placeholder="Search a programme, university or city…"
                  value={filters.search}
                  onChange={(e) => update('search', e.target.value)}
                />
                {filters.search && (
                  <button
                    className="icon-button"
                    aria-label="Clear search"
                    onClick={() => update('search', '')}
                  >
                    <X size={16} />
                  </button>
                )}
              </label>
            </div>
            <div className="catalogue-layout">
              <aside className={`filters ${showFilters ? 'shown' : ''}`}>{filterPanel}</aside>
              <section className="results">
                <div className="results-heading">
                  <div>
                    <h2>
                      {countries.find((c) => c.code === filters.country)?.flag}{' '}
                      {countries.find((c) => c.code === filters.country)?.name}
                    </h2>
                    <p>
                      <b>{results.length}</b> programmes to explore{' '}
                      <span>· {countryRows.length} in catalogue</span>
                    </p>
                  </div>
                  <button
                    className="mobile-filters button"
                    onClick={() => setShowFilters((v) => !v)}
                  >
                    <SlidersHorizontal size={16} /> Filters
                  </button>
                  <Select label="Sort by" value={filters.sort} onChange={(v) => update('sort', v)}>
                    <option value="institution">Institution A–Z</option>
                    <option value="fee">Full tuition: low to high</option>
                    <option value="rank">QS world rank</option>
                    <option value="intake">Earliest known intake</option>
                    <option value="duration">Duration: shortest first</option>
                  </Select>
                </div>
                <div className="catalogue-note">
                  <Info size={16} />
                  <span>
                    A note on the numbers: imported fees and intakes still need checking. Open a
                    course to see its sources.
                  </span>
                </div>
                {filters.sort === 'rank' && (
                  <p className="inline-note">
                    QS ranks are unavailable: public reuse permission has not been confirmed.{' '}
                    <a
                      href="https://www.topuniversities.com/world-university-rankings"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Visit the publisher <ArrowUpRight size={12} />
                    </a>
                  </p>
                )}
                {results.length === 0 ? (
                  <div className="empty">
                    <Globe2 size={36} />
                    <h3>
                      {countryRows.length
                        ? 'No programmes match yet.'
                        : 'This map is still being drawn.'}
                    </h3>
                    <p>
                      {countryRows.length
                        ? 'Try another city, intake or tuition budget.'
                        : 'This country has no public catalogue data yet. Your comparison selections are still here.'}
                    </p>
                    <button
                      className="button"
                      onClick={countryRows.length ? reset : () => setFilters(initialFilters)}
                    >
                      {countryRows.length ? 'Reset filters' : 'Explore New Zealand'}
                    </button>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table className="programme-table">
                      <thead>
                        <tr>
                          <th className="check-col">
                            <span className="sr-only">Compare</span>
                          </th>
                          <th>PROGRAMME / INSTITUTION</th>
                          <th>LOCATION & DURATION</th>
                          <th>NEXT INTAKE</th>
                          <th className="fee-heading">
                            TUITION <span>{filters.currency}</span>
                          </th>
                          <th>
                            <span className="sr-only">Save</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((p) => (
                          <tr key={p.id} className={selected.includes(p.id) ? 'selected-row' : ''}>
                            <td className="check-col">
                              <input
                                aria-label={`Compare ${p.institution} ${p.title}`}
                                type="checkbox"
                                checked={selected.includes(p.id)}
                                onChange={() => select(p.id)}
                              />
                            </td>
                            <td>
                              <div className="programme-name">
                                <ProviderMark p={p} />
                                <div>
                                  <button className="programme-link" onClick={() => setDetails(p)}>
                                    {p.title.startsWith('MSc') ? p.title : `Master of ${p.title}`}
                                  </button>
                                  <span className="institution">{p.institution}</span>
                                  <span className="course-meta">
                                    {p.credits ?? '—'} credits <span>·</span> {p.programmeType}
                                  </span>
                                  {matchReasons(p, priorities, rates).length > 0 && (
                                    <span className="priority-match">
                                      {matchReasons(p, priorities, rates)[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="location">
                              <span>
                                <MapPin size={12} />
                                {p.campuses.join(' / ')}
                              </span>
                              <small>
                                {p.durationMonths
                                  ? `${p.durationMonths} months`
                                  : 'Duration to confirm'}
                              </small>
                            </td>
                            <td>
                              <Intake p={p} />
                            </td>
                            <td className="fee-cell">
                              <Fee p={p} rates={rates} currency={filters.currency} />
                            </td>
                            <td>
                              <button
                                className={`icon-button save-button ${savedIds.includes(p.id) ? 'saved' : ''}`}
                                aria-label={`${savedIds.includes(p.id) ? 'Unsave' : 'Save'} ${p.institution} ${p.title}`}
                                onClick={() => save(p.id)}
                              >
                                <Bookmark
                                  size={19}
                                  fill={savedIds.includes(p.id) ? 'currentColor' : 'none'}
                                />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="results-footer">
                  <span>
                    <ShieldCheck size={14} /> Your shortlist stays on this device.
                  </span>
                  <span>
                    Select up to 4 programmes to compare <ArrowRight size={14} />
                  </span>
                </div>
                <section className="timeline-callout">
                  <div className="timeline-callout-icon">
                    <CalendarDays size={25} />
                  </div>
                  <div>
                    <span className="eyebrow">THE DATES MAKE A DIFFERENCE</span>
                    <h3>Same year. Different starting lines.</h3>
                    <p>
                      Pick two to four courses. We’ll put their start dates on the same calendar.
                    </p>
                  </div>
                  <div className="mini-timeline" aria-hidden="true">
                    <div>
                      <span>FEB</span>
                      <span>MAR</span>
                      <span>JUL</span>
                    </div>
                    <i />
                    <i />
                    <i />
                  </div>
                </section>
              </section>
            </div>
          </>
        )}
        {page === 'compare' && (
          <>
            <div className="page-heading">
              <div>
                <div className="eyebrow">02 / THE COMPARISON</div>
                <h1>Meet your options, side by side.</h1>
                <p>The fees, the dates, and the questions worth asking before you apply.</p>
              </div>
              <div className="actions">
                <button className="button" onClick={() => go('explore')}>
                  <Plus size={16} /> Add programmes
                </button>
                <button className="button primary" disabled={selected.length < 2} onClick={share}>
                  Share comparison <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
            {selected.length < 2 ? (
              <div className="empty">
                <GitCompareArrows size={36} />
                <h2>Give your options some company.</h2>
                <p>Select two to four programmes in Explore to build your comparison.</p>
                <button className="button primary" onClick={() => go('explore')}>
                  Explore programmes <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <>
                <section className="panel timeline-panel">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">SOME DATES BELONG ON THE CALENDAR</span>
                      <h2>Your intake timeline</h2>
                    </div>
                    <Select label="Timeline year" value={timelineYear} onChange={setTimelineYear}>
                      {[
                        ...new Set(
                          compareRows.flatMap((p) =>
                            p.intakes.map((i) => i.date?.slice(0, 4)).filter(Boolean),
                          ),
                        ),
                      ]
                        .sort()
                        .map((y) => (
                          <option key={y}>{y}</option>
                        ))}
                    </Select>
                  </div>
                  <Timeline rows={compareRows} year={timelineYear} />
                  <div className="timeline-legend">
                    <span>
                      <i className="legend-solid" /> Confirmed date
                    </span>
                    <span>
                      <i className="legend-outline" /> To confirm
                    </span>
                    <span>? Unknown start · outside the calendar</span>
                  </div>
                </section>
                <div className="compare-controls">
                  <Select
                    label="Compare full tuition in"
                    value={filters.currency}
                    onChange={changeCurrency}
                  >
                    {['NZD', 'INR'].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                  <button className="text-button" onClick={() => setSettings(true)}>
                    Edit exchange rate
                  </button>
                  <span>Unknown amounts are never treated as zero.</span>
                </div>
                <div className="compare-scroll">
                  <table className="compare-table">
                    <thead>
                      <tr>
                        <th>THE DETAILS</th>
                        {compareRows.map((p) => (
                          <th key={p.id}>
                            <button
                              className="remove-comparison"
                              aria-label={`Remove ${p.id} from comparison`}
                              onClick={() => select(p.id)}
                            >
                              <X size={15} />
                            </button>
                            <ProviderMark p={p} />
                            <h3>{p.title}</h3>
                            <span>{p.institution}</span>
                            <button className="button small" onClick={() => save(p.id)}>
                              <Bookmark size={14} />
                              {savedIds.includes(p.id) ? 'Saved' : 'Save programme'}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Location', (p: Programme) => p.campuses.join(' / ')],
                        [
                          'QS world rank',
                          () => (
                            <>
                              Unavailable · edition unconfirmed
                              <br />
                              <a
                                href="https://www.topuniversities.com/world-university-rankings"
                                target="_blank"
                                rel="noreferrer"
                              >
                                Publisher ↗
                              </a>
                            </>
                          ),
                        ],
                        ['Study area', (p: Programme) => p.studyArea],
                        [
                          'Qualification',
                          (p: Programme) =>
                            `${p.qualification} · ${p.credits ?? 'Unknown'} credits`,
                        ],
                        [
                          'Duration',
                          (p: Programme) =>
                            p.durationMonths ? `${p.durationMonths} months` : 'To confirm',
                        ],
                        [
                          'Intakes',
                          (p: Programme) => (
                            <>
                              {p.intakes.map((i, n) => (
                                <div key={n}>
                                  {intakeLabel(i)} <small>· {i.status}</small>
                                </div>
                              ))}
                            </>
                          ),
                        ],
                        [
                          'Full tuition estimate',
                          (p: Programme) => (
                            <>
                              <strong>
                                {money(
                                  convert(fullFee(p), p.fee.currency, filters.currency, rates),
                                  filters.currency,
                                )}
                              </strong>
                              <small>
                                {p.fee.scope !== 'full'
                                  ? 'Annual/partial quote excluded'
                                  : `Reference rate: ${rate} INR / NZD`}
                              </small>
                            </>
                          ),
                        ],
                        [
                          'Fee quote & scope',
                          (p: Programme) => <Fee p={p} rates={rates} currency={filters.currency} />,
                        ],
                        [
                          'Fee basis',
                          (p: Programme) => (
                            <>
                              {p.fee.basis}
                              {p.fee.calculation && <p className="helper">{p.fee.calculation}</p>}
                            </>
                          ),
                        ],
                        ['Other fees', (p: Programme) => p.otherFees],
                        ['Entry requirements', (p: Programme) => p.entry],
                        ['Application deadline', (p: Programme) => p.deadline ?? 'Not confirmed'],
                        [
                          'Remaining checks',
                          (p: Programme) => (
                            <ul className="review-list">
                              {reviewReasons(p).map((r) => (
                                <li key={r}>{r}</li>
                              ))}
                            </ul>
                          ),
                        ],
                        [
                          'Sources',
                          (p: Programme) => (
                            <>
                              {p.sources.map((s, i) => (
                                <p key={i}>
                                  <a href={s.url} target="_blank" rel="noreferrer">
                                    Official programme ↗
                                  </a>
                                  <small>
                                    {s.status} · {s.lastVerifiedAt ?? 'Not checked'}
                                  </small>
                                  {s.note && <small>{s.note}</small>}
                                </p>
                              ))}
                            </>
                          ),
                        ],
                      ].map(([label, render]) => (
                        <tr
                          className={
                            new Set(
                              compareRows.map((p) =>
                                label === 'Location'
                                  ? p.campuses.join('|')
                                  : label === 'Study area'
                                    ? p.studyArea
                                    : label === 'Duration'
                                      ? p.durationMonths
                                      : label === 'Full tuition estimate'
                                        ? convert(
                                            fullFee(p),
                                            p.fee.currency,
                                            filters.currency,
                                            rates,
                                          )
                                        : 'same',
                              ),
                            ).size > 1
                              ? 'varies'
                              : ''
                          }
                          key={label as string}
                        >
                          <th scope="row">{label as string}</th>
                          {compareRows.map((p) => (
                            <td key={p.id}>{(render as (p: Programme) => ReactNode)(p)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <section className="panel scenario">
                  <div>
                    <h2>Your living-cost scenario</h2>
                    <p>
                      A personal planning input, separate from tuition. Scholarships are not
                      deducted.
                    </p>
                  </div>
                  <label className="field">
                    <span>Monthly living costs ({filters.currency})</span>
                    <input
                      type="number"
                      min="0"
                      value={living}
                      placeholder="Enter your own estimate"
                      onChange={(e) => setLiving(e.target.value)}
                    />
                  </label>
                  {living &&
                    compareRows.map((p) => {
                      const fee = convert(fullFee(p), p.fee.currency, filters.currency, rates);
                      return (
                        <p key={p.id}>
                          <b>
                            {p.institution} · {p.title}
                          </b>
                          <br />
                          {fee !== null && p.durationMonths !== null
                            ? `${money(fee, filters.currency)} tuition + ${money(Number(living), filters.currency)} × ${p.durationMonths} months living = ${money(fee + Number(living) * p.durationMonths, filters.currency)} scenario`
                            : 'Total omitted: full tuition, currency rate or duration is missing.'}
                        </p>
                      );
                    })}
                </section>
              </>
            )}
          </>
        )}
        {page === 'shortlist' && (
          <>
            <div className="page-heading">
              <div>
                <div className="eyebrow">03 / THE KEEPERS</div>
                <h1>
                  My shortlist<span className="heading-count">{backup.items.length}</span>
                </h1>
                <p>Your plans, notes and next steps. Stored only on this device.</p>
              </div>
              <div className="actions">
                <button
                  className="button"
                  onClick={() => download('gradscape-shortlist.json', backup)}
                >
                  <Download size={16} /> Export backup
                </button>
                <button className="button" onClick={() => restoreInput.current?.click()}>
                  <Upload size={16} /> Restore backup
                </button>
                <input
                  className="sr-only"
                  ref={restoreInput}
                  type="file"
                  accept="application/json,.json"
                  aria-label="Restore shortlist file"
                  onChange={(e) => void fileRestore(e.target.files?.[0])}
                />
              </div>
            </div>
            {backup.items.length === 0 ? (
              <div className="empty">
                <Bookmark size={36} />
                <h2>Found something worth a second look?</h2>
                <p>Save a programme in Explore, then add notes and track your next step here.</p>
                <button className="button primary" onClick={() => go('explore')}>
                  Find programmes <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="shortlist-grid">
                {backup.items.map((item) => {
                  const p = programmes.find((p) => p.id === item.id)!;
                  return (
                    <article className="panel shortlist-card" key={item.id}>
                      <div className="shortlist-top">
                        <ProviderMark p={p} />
                        <button
                          className="icon-button"
                          aria-label={`Remove ${p.title} from shortlist`}
                          onClick={() => save(p.id)}
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <span className="eyebrow">{p.institution}</span>
                      <h2>
                        <button className="programme-link" onClick={() => setDetails(p)}>
                          Master of {p.title}
                        </button>
                      </h2>
                      <p className="helper">
                        {p.campuses.join(' / ')} ·{' '}
                        {p.durationMonths ? `${p.durationMonths} months` : 'Duration unconfirmed'}
                      </p>
                      <div className="shortlist-facts">
                        <Intake p={p} />
                        <Fee p={p} rates={rates} currency={filters.currency} />
                      </div>
                      <Select
                        label={`Application status for ${p.title}`}
                        value={item.status}
                        onChange={(v) =>
                          setBackup((b) => ({
                            ...b,
                            items: b.items.map((i) =>
                              i.id === p.id ? { ...i, status: v as typeof item.status } : i,
                            ),
                          }))
                        }
                      >
                        {statuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </Select>
                      <label className="field">
                        <span>My notes & questions for admissions</span>
                        <textarea
                          maxLength={20000}
                          value={item.notes}
                          placeholder="What do you need to confirm?"
                          onChange={(e) =>
                            setBackup((b) => ({
                              ...b,
                              items: b.items.map((i) =>
                                i.id === p.id ? { ...i, notes: e.target.value } : i,
                              ),
                            }))
                          }
                        />
                      </label>
                      <button className="button" onClick={() => select(p.id)}>
                        {selected.includes(p.id) ? <Check size={16} /> : <Plus size={16} />}{' '}
                        {selected.includes(p.id) ? 'Added to comparison' : 'Add to comparison'}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
        {page === 'priorities' && (
          <>
            <div className="page-heading">
              <div>
                <div className="eyebrow">04 / YOUR NON-NEGOTIABLES</div>
                <h1>My priorities</h1>
                <p>A good course has to work for your life. Start with the things that matter.</p>
              </div>
              <span className="device-label">
                <ShieldCheck size={16} /> Saved on this device
              </span>
            </div>
            <div className="priorities-layout">
              <section className="panel priorities-form">
                <h2>Set your own brief.</h2>
                <fieldset>
                  <legend>Preferred countries</legend>
                  <div className="chip-options">
                    {countries.map((c) => (
                      <label
                        key={c.code}
                        className={priorities.countries.includes(c.code) ? 'chosen' : ''}
                      >
                        <input
                          type="checkbox"
                          checked={priorities.countries.includes(c.code)}
                          onChange={() =>
                            setPriorities((pr) => ({
                              ...pr,
                              countries: pr.countries.includes(c.code)
                                ? pr.countries.filter((x) => x !== c.code)
                                : [...pr.countries, c.code],
                            }))
                          }
                        />
                        {c.flag} {c.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>Study areas</legend>
                  <div className="chip-options">
                    {[...new Set(programmes.map((p) => p.studyArea))].map((a) => (
                      <label key={a} className={priorities.areas.includes(a) ? 'chosen' : ''}>
                        <input
                          type="checkbox"
                          checked={priorities.areas.includes(a)}
                          onChange={() =>
                            setPriorities((pr) => ({
                              ...pr,
                              areas: pr.areas.includes(a)
                                ? pr.areas.filter((x) => x !== a)
                                : [...pr.areas, a],
                            }))
                          }
                        />
                        {a}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="field-pair">
                  <label className="field">
                    <span>Tuition budget</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="No maximum"
                      value={priorities.budget}
                      onChange={(e) => setPriorities((p) => ({ ...p, budget: e.target.value }))}
                    />
                  </label>
                  <Select
                    label="Budget currency"
                    value={priorities.currency}
                    onChange={(currency) =>
                      setPriorities((p) => {
                        const budget =
                          p.budget === ''
                            ? null
                            : convert(Number(p.budget), p.currency, currency, rates);
                        if (p.budget !== '' && budget === null) return p;
                        return { ...p, currency, budget: budget === null ? '' : String(budget) };
                      })
                    }
                  >
                    <option>NZD</option>
                    <option>INR</option>
                  </Select>
                </div>
                <div className="field-pair">
                  <label className="field">
                    <span>Target intake</span>
                    <input
                      type="month"
                      value={priorities.intake}
                      onChange={(e) => setPriorities((p) => ({ ...p, intake: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Maximum duration (months)</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Any duration"
                      value={priorities.maxDuration}
                      onChange={(e) =>
                        setPriorities((p) => ({ ...p, maxDuration: e.target.value }))
                      }
                    />
                  </label>
                </div>
                <p className="helper">
                  INR budgets use {rate} INR per NZD. These preferences highlight matches in
                  Explore; they do not hide other options.
                </p>
                <div className="saved-label">
                  <Check size={16} /> Preferences save automatically
                </div>
                <button className="button primary" onClick={() => go('explore')}>
                  Explore your options <ArrowRight size={16} />
                </button>
              </section>
              <aside className="priority-aside">
                <Compass size={32} />
                <h2>
                  Fit is personal.
                  <br />
                  Entry is a separate question.
                </h2>
                <p>
                  Subject, timing and budget can help narrow your list. They don’t determine
                  admission.
                </p>
                <p>
                  Ask admissions to assess your degree equivalence, grades, prerequisites and
                  experience against the published entry requirements.
                </p>
                <span className="tag">No admission probability scores</span>
              </aside>
            </div>
          </>
        )}
      </main>
      <footer className="footer">
        <div className="footer-main">
          <div className="footer-intro">
            <span className="eyebrow">A BIG DECISION. A BETTER START.</span>
            <h2>
              Go on.
              <br />
              See what’s out there<span>↗</span>
            </h2>
          </div>
          <div className="footer-links">
            <span className="footer-label">YOUR FIELD GUIDE</span>
            <a href="#explore">
              Find a master’s <ArrowUpRight size={16} />
            </a>
            <a href="#compare">
              Compare your options <ArrowUpRight size={16} />
            </a>
            <a href="#shortlist">
              Revisit your shortlist <ArrowUpRight size={16} />
            </a>
            <button onClick={() => setSettings(true)}>
              <span>Data & exchange rates</span> <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="footer-note">
            <GradScapeMark />
            <p>
              Made for the research rabbit holes, the “what ifs”, and the shortlist that keeps
              getting longer.
            </p>
            <p className="footer-storage">
              Your notes stay in this browser. Export a backup before clearing your browser data.
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <a
            className="brand"
            href="#explore"
            aria-label="GradScape home"
            onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}
          >
            <Brand />
          </a>
          <span>Independent research. Your decision.</span>
          <span>© {new Date().getFullYear()} GradScape</span>
          <a
            href="#explore"
            className="back-top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            BACK TO EXPLORING ↑
          </a>
        </div>
      </footer>
      {selected.length > 0 && (
        <div className="compare-tray">
          <div className="tray-inner">
            <div className="tray-label">
              <GitCompareArrows size={21} />
              <span>
                <b>{selected.length} of 4 selected</b>
                <small>Keep the good ones together</small>
              </span>
            </div>
            <div className="tray-courses">
              {compareRows.map((p) => (
                <button
                  key={p.id}
                  onClick={() => select(p.id)}
                  aria-label={`Remove ${p.institution} ${p.title} from selection`}
                >
                  <span>
                    {p.institution
                      .replace('University of ', '')
                      .replace('Auckland University of Technology', 'AUT')}
                    <small>{p.title}</small>
                  </span>
                  <X size={13} />
                </button>
              ))}
              {Array.from({ length: Math.max(0, 2 - selected.length) }, (_, i) => (
                <button className="tray-placeholder" key={i} onClick={() => go('explore')}>
                  <Plus size={16} /> Add a programme
                </button>
              ))}
            </div>
            <button className="tray-clear" onClick={() => setSelected([])}>
              Clear
            </button>
            <button
              className="button primary"
              disabled={selected.length < 2}
              onClick={() => go('compare')}
            >
              Compare {selected.length} <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
      {(notice || storageError || priorityError || rateError || currencyError) && (
        <div className="toast" role="status">
          {notice || storageError || priorityError || rateError || currencyError}
          <button aria-label="Dismiss notification" onClick={() => setNotice('')}>
            <X size={15} />
          </button>
        </div>
      )}
      {details && (
        <Modal title="Programme details" onClose={() => setDetails(null)}>
          <div className="detail-intro">
            <ProviderMark p={details} />
            <div>
              <span className="eyebrow">{details.institution}</span>
              <h2>
                {details.title.startsWith('MSc') ? details.title : `Master of ${details.title}`}
              </h2>
              <p>
                <MapPin size={14} /> {details.campuses.join(' / ')}
              </p>
            </div>
          </div>
          <div className="detail-facts">
            <div>
              <small>QUALIFICATION</small>
              <b>{details.qualification}</b>
              <span>
                {details.credits ?? 'Unknown'} credits · {details.programmeType}
              </span>
            </div>
            <div>
              <small>DURATION</small>
              <b>{details.durationMonths ? `${details.durationMonths} months` : 'To confirm'}</b>
            </div>
            <Fee p={details} rates={rates} currency={filters.currency} />
          </div>
          <h3>Intakes & deadlines</h3>
          {details.intakes.map((i, n) => (
            <p className="intake-detail" key={n}>
              <span className={`intake-dot ${i.status === 'confirmed' ? 'confirmed' : ''}`} />
              {intakeLabel(i)}{' '}
              <span className="tag">
                {i.status === 'confirmed'
                  ? 'Confirmed'
                  : i.status === 'unknown'
                    ? 'Unknown start'
                    : 'Published in workbook · to confirm'}
              </span>
            </p>
          ))}
          <p className="helper">
            Application deadline: {details.deadline ?? 'Not confirmed — ask admissions'}
          </p>
          <h3>Entry requirements</h3>
          <p>{details.entry}</p>
          <h3>Understanding this fee</h3>
          <p>
            {details.fee.basis}. {details.fee.year ?? 'Fee year unconfirmed'}. Scope:{' '}
            {details.fee.scope}.
          </p>
          {details.fee.calculation && <p className="calculation">{details.fee.calculation}</p>}
          <p>{details.otherFees}</p>
          <p className="helper">
            Scholarships are separate. An award-inclusive partial quote is not comparable to full
            tuition.
          </p>
          <h3>What still needs checking</h3>
          <ul className="review-list">
            {reviewReasons(details).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <h3>Sources & verification</h3>
          {details.sources.map((s, i) => (
            <div className="source-card" key={i}>
              <a href={s.url} target="_blank" rel="noreferrer">
                Official provider programme page <ArrowUpRight size={14} />
              </a>
              <span className="tag">
                {s.status} · {s.lastVerifiedAt ?? 'Not yet checked'}
              </span>
              <p className="helper">{s.facts.join(' · ')}</p>
              {s.note && <p>{s.note}</p>}
            </div>
          ))}
          {matchReasons(details, priorities, rates).map((r) => (
            <p className="priority-match" key={r}>
              {r}
            </p>
          ))}
          <div className="modal-actions">
            <button className="button" onClick={() => save(details.id)}>
              <Bookmark size={16} />
              {savedIds.includes(details.id) ? 'Saved to shortlist' : 'Save to shortlist'}
            </button>
            <button className="button primary" onClick={() => select(details.id)}>
              {selected.includes(details.id) ? 'Remove from comparison' : 'Add to comparison'}{' '}
              <Plus size={16} />
            </button>
          </div>
        </Modal>
      )}
      {settings && (
        <Modal title="Data & exchange rates" onClose={() => setSettings(false)}>
          <p>
            Fees are shown in their original currency. Conversions are planning estimates using your
            device’s saved rate.
          </p>
          <label className="field">
            <span>INR per 1 NZD</span>
            <input
              type="number"
              min="0.001"
              step="0.1"
              value={rate}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0 && Number.isFinite(v)) setRate(v);
              }}
            />
          </label>
          <p className="helper">
            Workbook reference: 52.9 INR per NZD · 10 November 2026.{' '}
            {rate !== 52.9
              ? 'Your custom rate is active.'
              : 'Dated reference; not a live market rate.'}
          </p>
          <button className="text-button" onClick={() => setRate(52.9)}>
            Reset to workbook reference
          </button>
          <Select
            label="Display / budget currency"
            value={filters.currency}
            onChange={changeCurrency}
          >
            {['NZD', 'INR'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <h3>27 imported pathways, with clear limitations</h3>
          <p>
            The public catalogue excludes applicant judgments, contacts, personal notes and
            application history. Most imported facts have not yet been checked against official
            sources. Scoped checks are shown in programme details.
          </p>
          <p>
            QS rankings are unavailable because public reuse permission is unconfirmed.{' '}
            <a
              href="https://www.topuniversities.com/world-university-rankings"
              target="_blank"
              rel="noreferrer"
            >
              View the publisher ↗
            </a>
          </p>
          <p>
            No accounts or live data feeds. Shortlist notes and priorities stay in this browser’s
            storage. Clearing browser data removes them; export a backup first.
          </p>
        </Modal>
      )}
      {restore && (
        <Modal title="Preview shortlist restore" onClose={() => setRestore(null)}>
          <p>
            This will replace {backup.items.length} saved programmes with {restore.items.length}{' '}
            programmes from your backup. Notes and statuses will be replaced.
          </p>
          <ul>
            {restore.items.map((i) => (
              <li key={i.id}>
                {programmes.find((p) => p.id === i.id)?.institution} ·{' '}
                {programmes.find((p) => p.id === i.id)?.title} — {i.status}
              </li>
            ))}
          </ul>
          <div className="modal-actions">
            <button className="button" onClick={() => setRestore(null)}>
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => {
                setBackup(restore);
                setRestore(null);
                setNotice('Shortlist restored on this device.');
              }}
            >
              Replace my shortlist
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

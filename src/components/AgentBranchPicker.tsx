/* =====================================================================
   AgentBranchPicker — the two linked select-or-add fields on the new
   application form. The agent field searches existing agencies (scoped to
   the user's partner) and offers "create new agent"; once an agent is
   chosen, the branch field unlocks, filtered to that agent's branches, with
   "create new branch" on the fly.

   Anything created writes to the shared org store via orgService and is
   flagged for reconciliation (see orgService.createAgency/BranchOnTheFly).
   ===================================================================== */
import { useState } from 'react';
import { createAgencyOnTheFly, createBranchOnTheFly, findAgency, searchAgencies, searchBranches } from '@/data';
import { useSession } from '@/session/SessionContext';
import { Icon } from '@/components/ui/Icon';
import { TypeAhead, highlightMatch, type TypeAheadOption } from '@/components/ui/TypeAhead';

export interface AgentBranchValue {
  agency: string;
  branch: string;
}

export function AgentBranchPicker({ onChange }: { onChange?: (value: AgentBranchValue) => void }) {
  const { partnerScope } = useSession();
  const [agentValue, setAgentValue] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
  const [branchValue, setBranchValue] = useState('');

  const report = (agency: string, branch: string) => onChange?.({ agency, branch });

  function selectAgency(name: string) {
    setSelectedAgency(name);
    setAgentValue(name);
    setBranchValue('');
    report(name, '');
  }

  function resetAgent(v: string) {
    setAgentValue(v);
    setSelectedAgency(null);
    setBranchValue('');
    report('', '');
  }

  // ---- agent options ----
  const agentQuery = agentValue.trim();
  const agentMatches = searchAgencies(agentValue, partnerScope);
  const agentExact = agentMatches.some((a) => a.name.toLowerCase() === agentQuery.toLowerCase());
  const agentOptions: TypeAheadOption[] = agentMatches.map((a) => ({
    id: a.name,
    icon: <Icon name="building" />,
    main: highlightMatch(a.name, agentQuery),
    sub: `${a.branches.length} branches`,
    onSelect: () => selectAgency(a.name),
  }));
  if (agentQuery && !agentExact) {
    agentOptions.push({
      id: '__create-agent',
      icon: <Icon name="plus" />,
      main: <>Create new agent &quot;{agentQuery}&quot;</>,
      sub: 'Add an agency not in the list',
      isNew: true,
      onSelect: () => {
        createAgencyOnTheFly(agentQuery, partnerScope);
        selectAgency(agentQuery);
      },
    });
  }

  function commitAgentEnter() {
    const q = agentValue.trim();
    if (!q) return;
    const existing = searchAgencies('', partnerScope).find((a) => a.name.toLowerCase() === q.toLowerCase());
    if (existing) selectAgency(existing.name);
    else {
      createAgencyOnTheFly(q, partnerScope);
      selectAgency(q);
    }
  }

  // ---- branch options ----
  const branchQuery = branchValue.trim();
  const agencyRec = selectedAgency ? findAgency(selectedAgency) : undefined;
  const branchMatches = selectedAgency ? searchBranches(selectedAgency, branchValue) : [];
  const branchExact = branchMatches.some((b) => b.name.toLowerCase() === branchQuery.toLowerCase());
  const branchOptions: TypeAheadOption[] = branchMatches.map((b) => ({
    id: b.name,
    icon: <Icon name="home" />,
    main: highlightMatch(b.name, branchQuery),
    sub: b.area || '',
    onSelect: () => {
      setBranchValue(b.name);
      report(selectedAgency!, b.name);
    },
  }));
  if (branchQuery && !branchExact && selectedAgency) {
    branchOptions.push({
      id: '__create-branch',
      icon: <Icon name="plus" />,
      main: <>Create new branch &quot;{branchQuery}&quot; in {selectedAgency}</>,
      sub: 'Add a branch to this agent',
      isNew: true,
      onSelect: () => {
        createBranchOnTheFly(selectedAgency, branchQuery);
        setBranchValue(branchQuery);
        report(selectedAgency, branchQuery);
      },
    });
  }

  function commitBranchEnter() {
    if (!selectedAgency) return;
    const q = branchValue.trim();
    if (!q || !agencyRec) return;
    const existing = agencyRec.branches.find((b) => b.name.toLowerCase() === q.toLowerCase());
    if (!existing) createBranchOnTheFly(selectedAgency, q);
    setBranchValue(q);
    report(selectedAgency, q);
  }

  return (
    <div className="form-grid">
      <div className="field span-2">
        <label htmlFor="ag-name">Agent</label>
        <TypeAhead
          id="ag-name"
          value={agentValue}
          onChange={resetAgent}
          onEnter={commitAgentEnter}
          options={agentOptions}
          placeholder="Search agencies or add a new one"
          emptyText="No agencies found"
        />
      </div>
      <div className="field span-2">
        <label htmlFor="br-name">Branch</label>
        <TypeAhead
          id="br-name"
          value={branchValue}
          onChange={(v) => setBranchValue(v)}
          onEnter={commitBranchEnter}
          options={branchOptions}
          placeholder={selectedAgency ? 'Search branches or add a new one' : 'Select an agent first'}
          disabled={!selectedAgency}
          emptyText="No branches found"
        />
        <span className="hint">Branches are filtered to the selected agent. Add a new branch on the fly if it is not listed.</span>
      </div>
    </div>
  );
}

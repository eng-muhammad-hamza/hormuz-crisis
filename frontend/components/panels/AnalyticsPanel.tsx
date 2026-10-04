'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { fuelPercent, fuelColor } from '@/lib/utils';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/theme';
import {
  SideDrawer,
  PanelHeader,
  StatCard,
  Panel,
} from '@/components/ui/primitives';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';
import { CargoBadge } from '@/components/ui/CargoBadge';

export default function AnalyticsPanel({ onClose }: { onClose: () => void }) {
  const { fleet, history } = useStore(
    useShallow((s) => ({
      fleet: s.fleet,
      history: s.history,
    }))
  );
  if (!fleet) return null;

  const ships = fleet.ships;
  const active = ships.filter((s) => !s.arrived);

  const statusCounts = Object.entries(
    ships.reduce(
      (acc, s) => ({ ...acc, [s.status]: (acc[s.status] || 0) + 1 }),
      {} as Record<string, number>
    )
  ).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || '#00E5FF',
  }));

  const fuelData = active
    .map((s) => ({
      name: s.name.slice(0, 8),
      fuel: Math.round(fuelPercent(s.fuel, s.fuelCapacity || 8500)),
    }))
    .sort((a, b) => a.fuel - b.fuel);

  const cargoTypes = Object.entries(
    ships.reduce(
      (acc, s) => ({ ...acc, [s.cargo]: (acc[s.cargo] || 0) + 1 }),
      {} as Record<string, number>
    )
  );

  const historyChart = history.slice(-20).map((snap, i) => ({
    t: i,
    alerts: snap.alertCount,
    active: snap.ships.filter(
      (s) => s.status !== 'arrived' && s.status !== 'stopped'
    ).length,
  }));

  const totalFuel = ships.reduce((a, s) => a + s.fuel, 0);
  const avgSpeed =
    active.reduce((a, s) => a + s.speed, 0) / Math.max(1, active.length);
  const distressCount = ships.filter((s) =>
    ['distressed', 'out_of_fuel', 'stranded'].includes(s.status)
  ).length;

  const ACCENT = '#00E5FF',
    DANGER = '#FF3366';

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { value: number; name: string; color?: string }[];
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono shadow-xl">
        {payload.map((p) => (
          <div key={p.name} style={{ color: p.color || ACCENT }}>
            {p.name}: <span className="font-bold">{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <SideDrawer width={420}>
      <PanelHeader
        iconName="activity"
        title="Fleet Analytics"
        subtitle={`Real-Time Telemetry Intel · Tick #${fleet.tickCount}`}
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 hide-scrollbar">
        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Active Vessels"
            value={active.length}
            iconName="anchor"
            colorClass="text-cyan-400"
          />
          <StatCard
            label="In Distress"
            value={distressCount}
            iconName="alert"
            colorClass={distressCount > 0 ? 'text-rose-400' : 'text-emerald-400'}
          />
          <StatCard
            label="Total Fuel"
            value={`${Math.round(totalFuel / 1000)}kt`}
            iconName="fuel"
            colorClass="text-emerald-400"
          />
          <StatCard
            label="Average Speed"
            value={`${avgSpeed.toFixed(0)} kn`}
            iconName="navigation"
            colorClass="text-cyan-400"
          />
        </div>

        {/* Status Distribution */}
        <Panel className="border-slate-800 bg-slate-900/60 shadow-lg">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80">
            <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
              STATUS DISTRIBUTION
            </h4>
          </div>
          <div className="p-4 flex items-center gap-4">
            <div className="w-28 h-28 shrink-0">
              <PieChart width={112} height={112}>
                <Pie
                  data={statusCounts}
                  cx={56}
                  cy={56}
                  innerRadius={28}
                  outerRadius={50}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {statusCounts.map((e, i) => (
                    <Cell key={i} fill={e.color} opacity={0.9} />
                  ))}
                </Pie>
              </PieChart>
            </div>
            <div className="flex-1 flex flex-col gap-1.5 text-xs">
              {statusCounts.map(({ name, value, color }) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span className="text-slate-300 font-medium">{name}</span>
                  </div>
                  <span className="font-bold tabular-nums" style={{ color }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Fuel Levels Bar Chart */}
        <Panel className="border-slate-800 bg-slate-900/60 shadow-lg">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80">
            <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
              VESSEL FUEL LEVELS (%)
            </h4>
          </div>
          <div className="p-3 h-48">
            <BarChart
              width={360}
              height={170}
              data={fuelData}
              layout="vertical"
              margin={{ left: 45, right: 12, top: 4, bottom: 4 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: '#94A3B8' }}
                width={45}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="fuel"
                name="Fuel %"
                radius={[0, 4, 4, 0]}
                maxBarSize={11}
              >
                {fuelData.map((e, i) => (
                  <Cell
                    key={i}
                    fill={fuelColor(e.fuel)}
                    opacity={0.9}
                  />
                ))}
              </Bar>
            </BarChart>
          </div>
        </Panel>

        {/* Activity Timeline Area Chart */}
        {historyChart.length > 3 && (
          <Panel className="border-slate-800 bg-slate-900/60 shadow-lg">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                TACTICAL ACTIVITY TIMELINE
              </h4>
              <span className="text-xs font-mono text-slate-500">
                {historyChart.length} TICKS
              </span>
            </div>
            <div className="p-3 h-28">
              <AreaChart
                width={360}
                height={85}
                data={historyChart}
                margin={{ left: 0, right: 6, top: 6, bottom: 0 }}
              >
                <XAxis dataKey="t" hide />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="active"
                  stroke={ACCENT}
                  fill={ACCENT}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  name="Active Vessels"
                />
                <Area
                  type="monotone"
                  dataKey="alerts"
                  stroke={DANGER}
                  fill={DANGER}
                  fillOpacity={0.25}
                  strokeWidth={2}
                  name="Alert Incidents"
                />
              </AreaChart>
            </div>
          </Panel>
        )}

        {/* Cargo Manifest Breakdown */}
        <Panel className="border-slate-800 bg-slate-900/60 shadow-lg">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80">
            <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
              CARGO MANIFEST DISTRIBUTION
            </h4>
          </div>
          <div className="p-4 flex flex-col gap-2.5">
            {cargoTypes.map(([cargo, count]) => (
              <div
                key={cargo}
                className="flex items-center justify-between text-xs sm:text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <CargoBadge cargo={cargo} iconOnly size={18} />
                  <span className="text-slate-200 font-semibold capitalize">
                    {cargo}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full bg-cyan-400/50"
                    style={{ width: Math.min(count * 25, 100) }}
                  />
                  <span className="font-bold text-cyan-400 min-w-[20px] text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </SideDrawer>
  );
}

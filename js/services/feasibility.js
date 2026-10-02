/* ==========================================================================
   Feasibility preview — SIMULATED FOR THE PROTOTYPE
   A structured model, not a random number: every output is a formula of the
   owner's answers and the editable assumptions. Outputs are estimates and are
   always labelled "تقديري · محاكاة". They are not audited projections and
   not Rif financial results.

   Revenue
     stays  = plannedRooms × nightValue × nights open per year × occupancy
              (nights open: 365 year-round, fewer for seasonal stays)
     day    = dayCapacity × operatingDays × utilisation × visitorSpend
   Operating costs
     = revenue × opexRatio + currentAnnualCosts × continuingCostShare
   Initial investment
     = (usableArea × devCostPerSqm
        + newRooms × newRoomCost
        + existingRooms × newRoomCost × refurbishShare × (1.2 − condition))
       × infrastructureFactor
   ========================================================================== */

import { MODEL_CONSTANTS as K, SCENARIOS, defaultAssumptions } from "../data/assumptions.js";
import { BUILDING_CONDITIONS } from "../data/assessment.js";

const num = (v) => (Number.isFinite(Number(v)) && v !== "" && v !== null ? Number(v) : 0);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/* Qassim seasonality: cooler months are the peak. Weights average to 1. */
export const SEASONALITY = [1.3, 1.25, 1.15, 0.95, 0.7, 0.5, 0.45, 0.6, 0.85, 1.15, 1.3, 1.4];

/** Physical plan derived from the answers (same for every scenario). */
export function derivePlan(answers = {}) {
  const usable = num(answers.usableArea);
  const rooms = Math.max(0, Math.floor(num(answers.rooms)));
  const newRooms =
    rooms >= K.targetRooms
      ? 0
      : Math.min(K.targetRooms - rooms, clamp(Math.round(usable / K.sqmPerNewRoom), 1, K.maxNewRooms));
  const dayCapacity = Math.min(K.maxDayCapacity, Math.floor(usable / K.sqmPerDayVisitor));
  const condition = BUILDING_CONDITIONS.find((c) => c.id === answers.buildingCondition)?.factor ?? 0.15;
  return { usable, rooms, newRooms, plannedRooms: rooms + newRooms, dayCapacity, condition };
}

function scenarioResult(answers, A, factors, infraScore) {
  const plan = derivePlan(answers);
  const price = A.avgBookingValue * factors.price;
  const occupancy = clamp(A.occupancy * factors.occupancy, 0, 0.9);
  const utilization = clamp(A.utilization * factors.utilization, 0, 0.9);
  const spend = A.avgSpend * factors.price;

  const nightsSold = plan.plannedRooms * A.stayNights * occupancy;
  const dayVisitors = plan.dayCapacity * K.operatingDays * utilization;
  const stayRevenue = nightsSold * price;
  const dayRevenue = dayVisitors * spend;
  const revenue = stayRevenue + dayRevenue;

  const opexRatio = clamp(A.opexRatio * factors.opex, 0.05, 0.98);
  const opex = revenue * opexRatio + num(answers.annualCosts) * K.continuingCostShare;
  const operatingProfit = revenue - opex;
  const margin = revenue > 0 ? operatingProfit / revenue : 0;

  const infraFactor = 1 + (100 - clamp(infraScore ?? 60, 0, 100)) / 200;
  const developmentCost = plan.usable * A.devCostPerSqm;
  const roomsCost = plan.newRooms * A.newRoomCost;
  const refurbCost = plan.rooms * A.newRoomCost * K.refurbishShare * (1.2 - plan.condition);
  const investment = (developmentCost + roomsCost + refurbCost) * infraFactor * factors.capex;

  const paybackYears = operatingProfit > 0 ? investment / operatingProfit : null;

  const monthly = SEASONALITY.map((w) => (revenue / 12) * w);

  return {
    revenue,
    stayRevenue,
    dayRevenue,
    opex,
    operatingProfit,
    margin,
    investment,
    investmentParts: { developmentCost: developmentCost * infraFactor * factors.capex, roomsCost: roomsCost * infraFactor * factors.capex, refurbCost: refurbCost * infraFactor * factors.capex },
    paybackYears,
    occupancy,
    utilization,
    nightsSold,
    dayVisitors,
    monthly,
    plan,
  };
}

/**
 * @param {object} answers      wizard answers
 * @param {object} assumptions  partial assumptions (missing keys use defaults)
 * @param {number} infraScore   infrastructure dimension score (0–100)
 */
export function computeFeasibility(answers, assumptions, infraScore) {
  const A = { ...defaultAssumptions(), ...(assumptions || {}) };
  const scenarios = {};
  SCENARIOS.forEach((s) => {
    scenarios[s.id] = scenarioResult(answers, A, s.factors, infraScore);
  });
  return { assumptions: A, plan: derivePlan(answers), scenarios };
}

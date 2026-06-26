import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspaces, WorkspaceRole } from "../context/WorkspaceContext";
import api from "../services/api";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  TrendingUp,
  Award,
  Activity,
} from "lucide-react";
import { DashboardSkeleton } from "../components/common/Skeleton";
import { formatActivityTime } from "../utils/formatDate";
import type {
  TaskSummary,
  UserTask,
  ActivityLogItem,
  ProjectAnalytic,
  MemberWorkload,
} from "../types";

export const Dashboard: React.FC = () => {
  const { activeWorkspace } = useWorkspaces();
  const navigate = useNavigate();

  const isManagerOrAdmin =
    activeWorkspace?.role === WorkspaceRole.ADMIN ||
    activeWorkspace?.role === WorkspaceRole.MANAGER;

  // Track if sleek console theme is active
  const [isSleek, setIsSleek] = useState(
    () => document.body.getAttribute("data-theme") === "sleek",
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsSleek(document.body.getAttribute("data-theme") === "sleek");
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  // 1. Fetch dashboard data using TanStack Query
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<{
    taskSummary: TaskSummary;
    myTasks: UserTask[];
    recentActivity: ActivityLogItem[];
  }>({
    queryKey: ["dashboard", activeWorkspace?.slug],
    queryFn: async () => {
      const res = await api.get(
        `/workspaces/${activeWorkspace?.slug}/dashboard`,
      );
      return res.data;
    },
    enabled: !!activeWorkspace?.slug,
  });

  // 2. Fetch analytics data using TanStack Query (Manager/Admin only)
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<{
    tasksByProject: ProjectAnalytic[];
    teamWorkload: MemberWorkload[];
  }>({
    queryKey: ["dashboardAnalytics", activeWorkspace?.slug],
    queryFn: async () => {
      const res = await api.get(
        `/workspaces/${activeWorkspace?.slug}/dashboard/analytics`,
      );
      return res.data;
    },
    enabled: !!activeWorkspace?.slug && isManagerOrAdmin,
  });

  const summary = dashboardData?.taskSummary || {
    TODO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };
  const myTasks = dashboardData?.myTasks || [];
  const activities = dashboardData?.recentActivity || [];

  const projectStats = analyticsData?.tasksByProject || [];
  const teamWorkload = analyticsData?.teamWorkload || [];

  const loading = dashboardLoading;

  const handleTaskClick = (projectId: string, taskId: string) => {
    navigate(
      `/w/${activeWorkspace?.slug}/projects/${projectId}?taskId=${taskId}`,
    );
  };

  const isOverdue = (dueDateStr: string | null) => {
    if (!dueDateStr) return false;
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const formatEvent = (log: ActivityLogItem) => {
    const taskTitle = log.taskTitle;
    switch (log.event) {
      case "CREATED":
        return `created task "${taskTitle}"`;
      case "STATUS_CHANGED":
        return `moved "${taskTitle}" to ${log.details?.new}`;
      case "ASSIGNEE_CHANGED":
        return `updated assignee for "${taskTitle}"`;
      case "PRIORITY_CHANGED":
        return `changed priority of "${taskTitle}" to ${log.details?.new}`;
      case "DUE_DATE_CHANGED":
        return `changed due date of "${taskTitle}"`;
      case "COMMENT_ADDED":
        return `commented on "${taskTitle}"`;
      case "TITLE_CHANGED":
        return `renamed task to "${log.details?.new}"`;
      default:
        return `modified task "${taskTitle}"`;
    }
  };

  // Chart Formatting Data
  const chartData = projectStats.map((p: ProjectAnalytic) => ({
    name: p.projectName,
    Todo: p.todo,
    "In Progress": p.inProgress,
    "In Review": p.inReview,
    Done: p.done,
  }));

  return (
    <div className="flex flex-col w-full page-enter">
      {/* Page Header */}
      <div className="flex justify-between items-end border-b-2 border-line-strong pb-5 mb-8 flex-wrap gap-3">
        <div>
          <h1 className="page-title text-3xl font-extrabold tracking-tight font-display text-ink uppercase">
            Workspace Dashboard
          </h1>
          <p className="eyebrow text-mute text-[11px] mt-1">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Summary Strip — 4 stat cards */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.08 },
              },
            }}
            initial="hidden"
            animate="show"
          >
            {/* To Do */}
            <motion.div
              className="bg-bone-2 border border-line rounded-md p-6 flex items-center gap-5 transition-all duration-250 hover:border-line-strong hover:-translate-y-0.5 hover:shadow-md"
              variants={{
                hidden: { y: 15, opacity: 0 },
                show: {
                  y: 0,
                  opacity: 1,
                  transition: { type: "spring", stiffness: 120 },
                },
              }}
            >
              <div className="w-11 h-11 rounded-sm flex items-center justify-center bg-mute/10 text-mute shrink-0">
                <Clock size={20} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-3xl font-black text-ink leading-tight">
                  {summary.TODO}
                </span>
                <span className="eyebrow text-[9px] text-mute">To Do</span>
              </div>
            </motion.div>

            {/* In Progress */}
            <motion.div
              className="bg-bone-2 border border-line rounded-md p-6 flex items-center gap-5 transition-all duration-250 hover:border-line-strong hover:-translate-y-0.5 hover:shadow-md"
              variants={{
                hidden: { y: 15, opacity: 0 },
                show: {
                  y: 0,
                  opacity: 1,
                  transition: { type: "spring", stiffness: 120 },
                },
              }}
            >
              <div className="w-11 h-11 rounded-sm flex items-center justify-center bg-[#FF8A3D]/10 text-[#FF8A3D] shrink-0">
                <TrendingUp size={20} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-3xl font-black text-ink leading-tight">
                  {summary.IN_PROGRESS}
                </span>
                <span className="eyebrow text-[9px] text-mute">In Progress</span>
              </div>
            </motion.div>

            {/* In Review */}
            <motion.div
              className="bg-bone-2 border border-line rounded-md p-6 flex items-center gap-5 transition-all duration-250 hover:border-line-strong hover:-translate-y-0.5 hover:shadow-md"
              variants={{
                hidden: { y: 15, opacity: 0 },
                show: {
                  y: 0,
                  opacity: 1,
                  transition: { type: "spring", stiffness: 120 },
                },
              }}
            >
              <div className="w-11 h-11 rounded-sm flex items-center justify-center bg-orange/10 text-orange shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-3xl font-black text-ink leading-tight">
                  {summary.IN_REVIEW}
                </span>
                <span className="eyebrow text-[9px] text-mute">In Review</span>
              </div>
            </motion.div>

            {/* Done */}
            <motion.div
              className="bg-bone-2 border border-line rounded-md p-6 flex items-center gap-5 transition-all duration-250 hover:border-line-strong hover:-translate-y-0.5 hover:shadow-md"
              variants={{
                hidden: { y: 15, opacity: 0 },
                show: {
                  y: 0,
                  opacity: 1,
                  transition: { type: "spring", stiffness: 120 },
                },
              }}
            >
              <div className="w-11 h-11 rounded-sm flex items-center justify-center bg-green/10 text-green shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-display text-3xl font-black text-ink leading-tight">
                  {summary.DONE}
                </span>
                <span className="eyebrow text-[9px] text-mute">Completed</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Core Panels Grid — My Tasks + Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Left Panel: My Tasks */}
            <div className="lg:col-span-7 bg-bone-2 border border-line rounded-md flex flex-col">
              <div className="px-6 py-5 border-b border-line flex items-center gap-2.5">
                <CheckCircle2 className="shrink-0 text-orange" size={18} />
                <h2 className="font-display font-extrabold text-base text-ink">
                  My Active Tasks
                </h2>
              </div>

              <div className="flex-1 p-6 overflow-hidden">
                {myTasks.length === 0 ? (
                  <div className="h-[200px] flex flex-col items-center justify-center gap-4 text-mute text-center">
                    <Award size={36} />
                    <p className="eyebrow">All caught up! No tasks assigned.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-0.5">
                    {myTasks.map((t: UserTask) => {
                      const overdue = isOverdue(t.dueDate);
                      return (
                        <div
                          key={t.id}
                          className={`group bg-bone border border-line rounded-sm px-5 py-3.5 flex flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:justify-between cursor-pointer transition-all duration-200 hover:border-ink hover:translate-x-0.5 ${overdue ? "border-l-[3px]! border-l-red-600!" : ""}`}
                          onClick={() => handleTaskClick(t.projectId, t.id)}
                        >
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0 w-full pr-0 sm:pr-4">
                            <span className="font-bold text-[14px] text-text truncate">
                              {t.title}
                            </span>
                            <span className="text-[9px] text-mute eyebrow mt-0.5">
                              {t.project.name}
                            </span>
                          </div>
                          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
                            <span
                              className={`badge ${t.priority === "HIGH" || t.priority === "URGENT" ? "badge-high" : "badge-medium"} text-[9px]`}
                            >
                              {t.priority}
                            </span>
                            <span className="badge badge-medium text-[9px]">
                              {t.status.replace("_", " ")}
                            </span>
                            {t.dueDate && (
                              <span
                                className={`font-mono text-[9px] eyebrow ${overdue ? "text-red-600 font-bold" : "text-mute"}`}
                              >
                                {new Date(t.dueDate).toLocaleDateString(
                                  undefined,
                                  { month: "short", day: "numeric" },
                                )}
                              </span>
                            )}
                          </div>
                          <ArrowRight
                            className="text-mute opacity-0 -translate-x-1 transition-all duration-150 ml-2 group-hover:opacity-100 group-hover:translate-x-0 shrink-0 hidden sm:block"
                            size={14}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Recent Activity */}
            <div className="lg:col-span-5 bg-bone-2 border border-line rounded-md flex flex-col">
              <div className="px-6 py-5 border-b border-line flex items-center gap-2.5">
                <Activity className="shrink-0 text-text" size={18} />
                <h2 className="font-display font-extrabold text-base text-ink">
                  Recent Activity
                </h2>
              </div>

              <div className="flex-1 p-6 overflow-hidden">
                {activities.length === 0 ? (
                  <div className="h-[200px] flex flex-col items-center justify-center gap-4 text-mute text-center">
                    <FolderOpen size={36} />
                    <p className="eyebrow">No logs recorded yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0 max-h-[420px] overflow-y-auto pr-0.5">
                    {activities.map((log: ActivityLogItem) => (
                      <div
                        key={log.id}
                        className="flex gap-3.5 items-start text-[13px] py-4 border-b border-dashed border-line last:border-none last:pb-0"
                      >
                        <img
                          src={
                            log.user.avatarUrl ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${log.user.name}`
                          }
                          alt={log.user.name}
                          className="w-7 h-7 rounded-sm shrink-0 mt-0.5"
                        />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <p className="text-text leading-relaxed text-[13px]">
                            <strong className="font-bold text-ink">
                              {log.user.name}
                            </strong>{" "}
                            {formatEvent(log)}
                          </p>
                          <span className="font-mono text-[9px] text-mute">
                            {formatActivityTime(log.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MANAGER & ADMIN ONLY Analytics Section */}
          {isManagerOrAdmin && (
            <div className="flex flex-col gap-6 pt-4 mt-2 border-t-2 border-line-strong">
              {/* Analytics Section Header */}
              <div className="flex items-center gap-4 pt-6 pb-2">
                <h2 className="section-heading text-2xl">Workspace Analytics</h2>
                <span className="badge badge-urgent">Manager View</span>
              </div>

              {analyticsLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-ink border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
                  {/* Tasks by Project Chart */}
                  <div className="bg-bone-2 border border-line rounded-md flex flex-col">
                    <div className="px-6 py-5 border-b border-line">
                      <h3 className="font-display font-extrabold text-base text-ink">
                        Tasks by Project
                      </h3>
                    </div>
                    <div className="p-6 flex-1 flex justify-center items-center">
                      {projectStats.length === 0 ? (
                        <div className="h-[200px] flex flex-col items-center justify-center text-mute text-center">
                          <p className="eyebrow">
                            No projects found to display chart
                          </p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={chartData}
                            margin={{ top: 16, right: 20, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={
                                isSleek
                                  ? "rgba(255, 255, 255, 0.05)"
                                  : "rgba(27,23,19,0.05)"
                              }
                            />
                            <XAxis
                              dataKey="name"
                              stroke={isSleek ? "#00F5FF" : "#8B847A"}
                              fontSize={11}
                              fontFamily="Space Mono"
                            />
                            <YAxis
                              stroke={isSleek ? "#00F5FF" : "#8B847A"}
                              fontSize={11}
                              fontFamily="Space Mono"
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: isSleek
                                  ? "#121212"
                                  : "#1B1713",
                                color: isSleek ? "#E0E2E5" : "#F2EFE9",
                                border: isSleek
                                  ? "1px solid rgba(255,255,255,0.05)"
                                  : "none",
                                fontFamily: "Switzer",
                                fontSize: "13px",
                              }}
                            />
                            <Legend
                              wrapperStyle={{
                                fontFamily: "Space Mono",
                                fontSize: "10px",
                                textTransform: "uppercase",
                                paddingTop: "12px",
                              }}
                            />
                            <Bar
                              dataKey="Todo"
                              stackId="a"
                              fill={isSleek ? "#1F232D" : "#8B847A"}
                            />
                            <Bar
                              dataKey="In Progress"
                              stackId="a"
                              fill={isSleek ? "#00838F" : "#FF8A3D"}
                            />
                            <Bar
                              dataKey="In Review"
                              stackId="a"
                              fill={isSleek ? "#00B8D4" : "#F44E14"}
                            />
                            <Bar
                              dataKey="Done"
                              stackId="a"
                              fill={isSleek ? "#00F5FF" : "#3DCC6D"}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Team Workload Table */}
                  <div className="bg-bone-2 border border-line rounded-md flex flex-col">
                    <div className="px-6 py-5 border-b border-line">
                      <h3 className="font-display font-extrabold text-base text-ink">
                        Team Workload
                      </h3>
                    </div>
                    <div className="flex-1 overflow-hidden px-6 pb-6">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b-2 border-line-strong">
                              <th className="py-3.5 px-5 text-left eyebrow text-[9px] text-mute">
                                Member
                              </th>
                              <th className="py-3.5 px-5 text-center eyebrow text-[9px] text-mute">
                                Open Tasks
                              </th>
                              <th className="py-3.5 px-5 text-center eyebrow text-[9px] text-mute">
                                Done (This Week)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamWorkload.map((m: MemberWorkload) => (
                              <tr
                                key={m.userId}
                                className="border-b border-line last:border-none transition-colors duration-150 hover:bg-orange/5"
                              >
                                <td className="py-4 px-5 text-left">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={
                                        m.avatarUrl ||
                                        `https://api.dicebear.com/7.x/initials/svg?seed=${m.name}`
                                      }
                                      alt={m.name}
                                      className="w-8 h-8 rounded-sm shrink-0"
                                    />
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-bold text-sm text-text">
                                        {m.name}
                                      </span>
                                      <span className="text-[8px] text-mute eyebrow">
                                        {m.role}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-5 text-center font-mono text-sm text-text">
                                  {m.openTasksCount}
                                </td>
                                <td className="py-4 px-5 text-center font-mono text-sm text-green font-bold">
                                  {m.completedTasksThisWeekCount}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Lock, Eye, EyeOff, RefreshCw, Users, Activity, Clock, TrendingUp, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  // Summary
  totalVisits: number;
  uniqueVisitors: number;
  totalCampaigns: number;
  trafficSourcesCount: number;
  
  // Sessions
  totalSessions: number;
  avgSessionDuration: number;
  repeatVisitors: number;
  
  // Engagement
  avgTimeOnPage: number;
  bounceRate: number;
  engagedSessions: number;
  avgScrollDepth: number;
  
  // Breakdowns
  trafficBySource: Array<{ source: string; count: number }>;
  trafficByCampaign: Array<{ campaign: string; count: number }>;
  trafficByMedium: Array<{ medium: string; count: number }>;
  eventHeatmap: Array<{ event_name: string; event_type: string; count: number }>;
  recentVisits: Array<{
    created_at: string;
    visitor_id: string;
    session_id: string;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    device_type: string | null;
    session_start: string;
    session_end: string | null;
    total_duration_seconds: number;
  }>;
}

type DateRange = '7days' | '30days' | 'all' | 'custom';

export default function Analytics() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const { toast } = useToast();

  const getDateFilter = () => {
    const now = new Date();
    let startDate: string | null = null;

    switch (dateRange) {
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'custom':
        if (customStartDate) {
          startDate = customStartDate.toISOString();
        }
        break;
      case 'all':
      default:
        startDate = null;
    }

    const endDate = dateRange === 'custom' && customEndDate 
      ? customEndDate.toISOString() 
      : now.toISOString();

    return { startDate, endDate };
  };

  const handleLogin = () => {
    if (password === 'admin123') {
      setIsAuthenticated(true);
      fetchAnalytics();
    } else {
      toast({
        title: 'Invalid Password',
        description: 'Please enter the correct password',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics();
    }
  }, [dateRange, customStartDate, customEndDate]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateFilter();

      // Build queries with date filters
      let sessionsQuery = supabase
        .from('user_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (startDate) {
        sessionsQuery = sessionsQuery.gte('created_at', startDate);
      }
      if (endDate) {
        sessionsQuery = sessionsQuery.lte('created_at', endDate);
      }

      const { data: sessions } = await sessionsQuery;

      // Fetch page analytics with date filter
      let pageAnalyticsQuery = supabase
        .from('page_analytics')
        .select('*');
      
      if (startDate) {
        pageAnalyticsQuery = pageAnalyticsQuery.gte('created_at', startDate);
      }
      if (endDate) {
        pageAnalyticsQuery = pageAnalyticsQuery.lte('created_at', endDate);
      }

      const { data: pageAnalytics } = await pageAnalyticsQuery;

      // Fetch events with date filter
      let eventsQuery = supabase
        .from('user_events')
        .select('*');
      
      if (startDate) {
        eventsQuery = eventsQuery.gte('created_at', startDate);
      }
      if (endDate) {
        eventsQuery = eventsQuery.lte('created_at', endDate);
      }

      const { data: events } = await eventsQuery;

      // Fetch UTM data with date filter
      let utmQuery = supabase
        .from('utm_tracking')
        .select('*');
      
      if (startDate) {
        utmQuery = utmQuery.gte('created_at', startDate);
      }
      if (endDate) {
        utmQuery = utmQuery.lte('created_at', endDate);
      }

      const { data: utmData } = await utmQuery;

      // Calculate metrics
      const totalSessions = sessions?.length || 0;
      const uniqueVisitors = new Set(sessions?.map(s => s.visitor_id)).size;

      // Count unique campaigns and sources
      const uniqueCampaigns = new Set(
        sessions?.filter(s => s.utm_campaign).map(s => s.utm_campaign)
      ).size;
      const uniqueSources = new Set(
        sessions?.filter(s => s.utm_source).map(s => s.utm_source)
      ).size;

      // Average session duration
      const avgSessionDuration = sessions?.length
        ? Math.floor(sessions.reduce((sum, s) => sum + (s.total_duration_seconds || 0), 0) / sessions.length)
        : 0;

      // Repeat visitors (visitors with 2+ sessions)
      const visitorSessionCounts: Record<string, number> = {};
      sessions?.forEach(s => {
        visitorSessionCounts[s.visitor_id] = (visitorSessionCounts[s.visitor_id] || 0) + 1;
      });
      const repeatVisitors = Object.values(visitorSessionCounts).filter(count => count >= 2).length;

      // Average time on page
      const avgTimeOnPage = pageAnalytics?.length
        ? Math.floor(pageAnalytics.reduce((sum, p) => sum + (p.time_on_page_seconds || 0), 0) / pageAnalytics.length)
        : 0;

      // Bounce rate (sessions < 10 seconds)
      const bouncedSessions = sessions?.filter(s => (s.total_duration_seconds || 0) < 10).length || 0;
      const bounceRate = totalSessions ? Math.floor((bouncedSessions / totalSessions) * 100) : 0;

      // Engaged sessions (>30s with interactions)
      const engagedSessions = pageAnalytics?.filter(
        p => (p.time_on_page_seconds || 0) > 30 && (p.interactions_count || 0) > 0
      ).length || 0;

      // Average scroll depth
      const avgScrollDepth = pageAnalytics?.length
        ? Math.floor(pageAnalytics.reduce((sum, p) => sum + (p.scroll_depth_percent || 0), 0) / pageAnalytics.length)
        : 0;

      // Traffic by Source
      const sourceCounts: Record<string, number> = {};
      sessions?.forEach(s => {
        const source = s.utm_source || 'direct';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });
      const trafficBySource = Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);

      // Traffic by Campaign
      const campaignCounts: Record<string, number> = {};
      sessions?.forEach(s => {
        if (s.utm_campaign) {
          campaignCounts[s.utm_campaign] = (campaignCounts[s.utm_campaign] || 0) + 1;
        }
      });
      const trafficByCampaign = Object.entries(campaignCounts)
        .map(([campaign, count]) => ({ campaign, count }))
        .sort((a, b) => b.count - a.count);

      // Traffic by Medium
      const mediumCounts: Record<string, number> = {};
      sessions?.forEach(s => {
        if (s.utm_medium) {
          mediumCounts[s.utm_medium] = (mediumCounts[s.utm_medium] || 0) + 1;
        }
      });
      const trafficByMedium = Object.entries(mediumCounts)
        .map(([medium, count]) => ({ medium, count }))
        .sort((a, b) => b.count - a.count);

      // Event Heatmap
      const eventCounts: Record<string, { event_type: string; count: number }> = {};
      events?.forEach(e => {
        if (!eventCounts[e.event_name]) {
          eventCounts[e.event_name] = { event_type: e.event_type, count: 0 };
        }
        eventCounts[e.event_name].count++;
      });
      const eventHeatmap = Object.entries(eventCounts)
        .map(([event_name, data]) => ({ event_name, event_type: data.event_type, count: data.count }))
        .sort((a, b) => b.count - a.count);

      // Recent visits (last 20)
      const recentVisits = sessions?.slice(0, 20) || [];

      setData({
        totalVisits: totalSessions,
        uniqueVisitors,
        totalCampaigns: uniqueCampaigns,
        trafficSourcesCount: uniqueSources,
        totalSessions,
        avgSessionDuration,
        repeatVisitors,
        avgTimeOnPage,
        bounceRate,
        engagedSessions,
        avgScrollDepth,
        trafficBySource,
        trafficByCampaign,
        trafficByMedium,
        eventHeatmap,
        recentVisits,
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async (tableName: 'utm_tracking' | 'user_sessions' | 'page_analytics' | 'user_events') => {
    try {
      const { startDate, endDate } = getDateFilter();

      let query = supabase.from(tableName).select('*');
      
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data } = await query;
      
      if (!data || data.length === 0) {
        toast({
          title: 'No Data',
          description: 'No data available to export for selected date range',
        });
        return;
      }

      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(','),
        ...data.map(row =>
          headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableName}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: `${tableName} data exported successfully`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive',
      });
    }
  };

  const exportUniqueVisitors = async () => {
    try {
      const { startDate, endDate } = getDateFilter();

      let sessionsQuery = supabase
        .from('user_sessions')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (startDate) {
        sessionsQuery = sessionsQuery.gte('created_at', startDate);
      }
      if (endDate) {
        sessionsQuery = sessionsQuery.lte('created_at', endDate);
      }

      const { data: sessions } = await sessionsQuery;

      if (!sessions || sessions.length === 0) {
        toast({
          title: 'No Data',
          description: 'No visitor data available for selected date range',
        });
        return;
      }

      // Group sessions by visitor_id
      const visitorData: Record<string, {
        visitor_id: string;
        first_seen: string;
        last_seen: string;
        total_sessions: number;
        total_time_seconds: number;
        device_types: Set<string>;
        utm_sources: Set<string>;
        utm_mediums: Set<string>;
        utm_campaigns: Set<string>;
      }> = {};

      sessions.forEach(session => {
        if (!visitorData[session.visitor_id]) {
          visitorData[session.visitor_id] = {
            visitor_id: session.visitor_id,
            first_seen: session.created_at,
            last_seen: session.created_at,
            total_sessions: 0,
            total_time_seconds: 0,
            device_types: new Set(),
            utm_sources: new Set(),
            utm_mediums: new Set(),
            utm_campaigns: new Set(),
          };
        }

        const visitor = visitorData[session.visitor_id];
        visitor.total_sessions++;
        visitor.total_time_seconds += session.total_duration_seconds || 0;
        
        if (session.created_at < visitor.first_seen) {
          visitor.first_seen = session.created_at;
        }
        if (session.created_at > visitor.last_seen) {
          visitor.last_seen = session.created_at;
        }
        
        if (session.device_type) visitor.device_types.add(session.device_type);
        if (session.utm_source) visitor.utm_sources.add(session.utm_source);
        if (session.utm_medium) visitor.utm_mediums.add(session.utm_medium);
        if (session.utm_campaign) visitor.utm_campaigns.add(session.utm_campaign);
      });

      // Convert to CSV
      const visitorArray = Object.values(visitorData).map(v => ({
        visitor_id: v.visitor_id,
        first_seen: new Date(v.first_seen).toLocaleString(),
        last_seen: new Date(v.last_seen).toLocaleString(),
        total_sessions: v.total_sessions,
        total_time_minutes: Math.floor(v.total_time_seconds / 60),
        total_time_seconds: v.total_time_seconds % 60,
        device_types: Array.from(v.device_types).join('; ') || 'unknown',
        utm_sources: Array.from(v.utm_sources).join('; ') || 'direct',
        utm_mediums: Array.from(v.utm_mediums).join('; ') || '-',
        utm_campaigns: Array.from(v.utm_campaigns).join('; ') || '-',
        is_repeat_visitor: v.total_sessions >= 2 ? 'Yes' : 'No',
      }));

      const headers = ['Visitor ID', 'First Seen', 'Last Seen', 'Total Sessions', 'Total Time (Minutes)', 'Total Time (Seconds)', 'Device Types', 'UTM Sources', 'UTM Mediums', 'UTM Campaigns', 'Repeat Visitor'];
      const csv = [
        headers.join(','),
        ...visitorArray.map(row =>
          [
            row.visitor_id,
            `"${row.first_seen}"`,
            `"${row.last_seen}"`,
            row.total_sessions,
            row.total_time_minutes,
            row.total_time_seconds,
            `"${row.device_types}"`,
            `"${row.utm_sources}"`,
            `"${row.utm_mediums}"`,
            `"${row.utm_campaigns}"`,
            row.is_repeat_visitor,
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unique_visitors_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: `${visitorArray.length} unique visitors exported successfully`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to export unique visitors data',
        variant: 'destructive',
      });
    }
  };

  const exportFeedback = async () => {
    try {
      const { startDate, endDate } = getDateFilter();

      let query = supabase.from('feedback_responses').select('*');
      
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data } = await query.order('created_at', { ascending: false });
      
      if (!data || data.length === 0) {
        toast({
          title: 'No Data',
          description: 'No feedback data available for selected date range',
        });
        return;
      }

      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(','),
        ...data.map(row =>
          headers.map(header => {
            const value = row[header as keyof typeof row];
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback_responses_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: `Exported ${data.length} feedback responses`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to export feedback data',
        variant: 'destructive',
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Analytics Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button onClick={handleLogin} className="w-full">
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const exportFullReport = () => {
    if (!data) return;

    const dateRangeText = dateRange === 'custom' && customStartDate && customEndDate
      ? `${format(customStartDate, 'PPP')} - ${format(customEndDate, 'PPP')}`
      : dateRange === '7days' 
      ? 'Last 7 Days'
      : dateRange === '30days'
      ? 'Last 30 Days'
      : 'All Time';

    const report = [
      '=== ANALYTICS FULL REPORT ===',
      `Generated: ${new Date().toLocaleString()}`,
      `Date Range: ${dateRangeText}`,
      '',
      '--- SUMMARY ---',
      `Total Visits: ${data.totalVisits}`,
      `Unique Visitors: ${data.uniqueVisitors}`,
      `Number of Campaigns: ${data.totalCampaigns}`,
      `Traffic Sources: ${data.trafficSourcesCount}`,
      '',
      '--- SESSION ANALYTICS ---',
      `Total Sessions: ${data.totalSessions}`,
      `Average Session Duration: ${Math.floor(data.avgSessionDuration / 60)}m ${data.avgSessionDuration % 60}s`,
      `Repeat Visitors: ${data.repeatVisitors}`,
      '',
      '--- ENGAGEMENT METRICS ---',
      `Average Time on Page: ${Math.floor(data.avgTimeOnPage / 60)}m ${data.avgTimeOnPage % 60}s`,
      `Bounce Rate: ${data.bounceRate}%`,
      `Engaged Sessions: ${data.engagedSessions}`,
      `Average Scroll Depth: ${data.avgScrollDepth}%`,
      '',
      '--- TRAFFIC BY SOURCE ---',
      ...data.trafficBySource.map(s => `${s.source}: ${s.count}`),
      '',
      '--- TRAFFIC BY CAMPAIGN ---',
      ...data.trafficByCampaign.map(c => `${c.campaign}: ${c.count}`),
      '',
      '--- TRAFFIC BY MEDIUM ---',
      ...data.trafficByMedium.map(m => `${m.medium}: ${m.count}`),
      '',
      '--- EVENT HEATMAP (Top 10) ---',
      ...data.eventHeatmap.slice(0, 10).map(e => `${e.event_name} (${e.event_type}): ${e.count}`),
      '',
      '--- UNIQUE VISITORS BREAKDOWN ---',
      `Unique Visitors: ${data.uniqueVisitors}`,
      `Repeat Visitors (2+ sessions): ${data.repeatVisitors}`,
      `New Visitors: ${data.uniqueVisitors - data.repeatVisitors}`,
      `Repeat Rate: ${data.uniqueVisitors > 0 ? Math.round((data.repeatVisitors / data.uniqueVisitors) * 100) : 0}%`,
    ].join('\n');

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_report_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Full report exported successfully',
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <div className="flex gap-2">
            <Button onClick={fetchAnalytics} disabled={loading} variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <TabsList>
                  <TabsTrigger value="7days">Last 7 Days</TabsTrigger>
                  <TabsTrigger value="30days">Last 30 Days</TabsTrigger>
                  <TabsTrigger value="all">All Time</TabsTrigger>
                  <TabsTrigger value="custom">Custom</TabsTrigger>
                </TabsList>
              </Tabs>

              {dateRange === 'custom' && (
                <div className="flex gap-2 items-center flex-wrap">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("justify-start text-left font-normal", !customStartDate && "text-muted-foreground")}>
                        <Calendar className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, 'PPP') : 'Start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <span className="text-muted-foreground">to</span>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("justify-start text-left font-normal", !customEndDate && "text-muted-foreground")}>
                        <Calendar className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, 'PPP') : 'End date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {data && (
          <>
            {/* Summary Cards */}
            <div>
              <h2 className="text-xl font-semibold mb-3">Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total Visits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      <p className="text-3xl font-bold">{data.totalVisits}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Unique Visitors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      <p className="text-3xl font-bold">{data.uniqueVisitors}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Campaigns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <p className="text-3xl font-bold">{data.totalCampaigns}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Traffic Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <p className="text-3xl font-bold">{data.trafficSourcesCount}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Session Analytics */}
            <div>
              <h2 className="text-xl font-semibold mb-3">Session Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{data.totalSessions}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Avg Session Duration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      <p className="text-2xl font-bold">
                        {Math.floor(data.avgSessionDuration / 60)}m {data.avgSessionDuration % 60}s
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Unique Visitors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{data.uniqueVisitors}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Repeat Visitors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{data.repeatVisitors}</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Engagement Metrics */}
            <div>
              <h2 className="text-xl font-semibold mb-3">Engagement Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Avg Time on Page</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {Math.floor(data.avgTimeOnPage / 60)}m {data.avgTimeOnPage % 60}s
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Bounce Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{data.bounceRate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Sessions &lt;10s</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Engaged Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{data.engagedSessions}</p>
                    <p className="text-xs text-muted-foreground mt-1">&gt;30s with interactions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Avg Scroll Depth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{data.avgScrollDepth}%</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Event Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle>Event Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Event Name</th>
                        <th className="text-left py-2 px-4">Event Type</th>
                        <th className="text-right py-2 px-4">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.eventHeatmap.slice(0, 10).map((event, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-2 px-4 font-medium">{event.event_name}</td>
                          <td className="py-2 px-4">
                            <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                              {event.event_type}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right font-semibold">{event.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Traffic Breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Traffic by Source</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.trafficBySource.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="font-medium">{item.source}</span>
                        <span className="text-muted-foreground">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Traffic by Campaign</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.trafficByCampaign.length > 0 ? (
                      data.trafficByCampaign.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="font-medium">{item.campaign}</span>
                          <span className="text-muted-foreground">{item.count}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No campaign data</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Traffic by Medium</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.trafficByMedium.length > 0 ? (
                      data.trafficByMedium.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="font-medium">{item.medium}</span>
                          <span className="text-muted-foreground">{item.count}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No medium data</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Visits */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Visits (Last 20)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Date & Time</th>
                        <th className="text-left py-2 px-2">Visitor ID</th>
                        <th className="text-left py-2 px-2">Device</th>
                        <th className="text-left py-2 px-2">Source</th>
                        <th className="text-left py-2 px-2">Medium</th>
                        <th className="text-left py-2 px-2">Campaign</th>
                        <th className="text-right py-2 px-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentVisits.map((visit, i) => (
                        <tr key={i} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-2 whitespace-nowrap">
                            {new Date(visit.created_at).toLocaleString()}
                          </td>
                          <td className="py-2 px-2 font-mono text-xs">
                            {visit.visitor_id.slice(0, 8)}...
                          </td>
                          <td className="py-2 px-2">{visit.device_type || 'N/A'}</td>
                          <td className="py-2 px-2">{visit.utm_source || 'direct'}</td>
                          <td className="py-2 px-2">{visit.utm_medium || '-'}</td>
                          <td className="py-2 px-2">{visit.utm_campaign || '-'}</td>
                          <td className="py-2 px-2 text-right">
                            {visit.total_duration_seconds 
                              ? `${Math.floor(visit.total_duration_seconds / 60)}m ${visit.total_duration_seconds % 60}s`
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Export Data */}
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={exportFullReport} className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Export Full Report
                  </Button>
                  <Button onClick={exportUniqueVisitors} variant="secondary" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Export Unique Visitors
                  </Button>
                  <Button onClick={exportFeedback} variant="secondary" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Export Feedback
                  </Button>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Export raw data tables:</p>
                  <div className="flex flex-wrap gap-2">
                    {(['utm_tracking', 'user_sessions', 'page_analytics', 'user_events'] as const).map(table => (
                      <Button
                        key={table}
                        variant="outline"
                        size="sm"
                        onClick={() => exportToCSV(table)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {table.replace(/_/g, ' ')}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <p>• Full Report: Summary statistics in text format</p>
                  <p>• Unique Visitors: Detailed visitor breakdown with sessions and engagement</p>
                  <p>• Raw Tables: Complete database exports for custom analysis</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

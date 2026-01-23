'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ChartPoint {
  date: string;
  [key: string]: string | number;
}

interface AnalyticsData {
  revenue_chart: ChartPoint[];
  licenses_chart: ChartPoint[];
  devices_chart: ChartPoint[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const response = (await apiClient.getAnalytics(period)) as AnalyticsData;

        // Transform dates to localized format
        const formatDate = (dateStr: string) => {
          const date = new Date(dateStr);
          return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        };

        setData({
          revenue_chart: response.revenue_chart.map((p) => ({
            ...p,
            date: formatDate(p.date),
            value: typeof p.value === 'number' ? p.value : 0,
          })),
          licenses_chart: response.licenses_chart.map((p) => ({
            ...p,
            date: formatDate(p.date),
          })),
          devices_chart: response.devices_chart.map((p) => ({
            ...p,
            date: formatDate(p.date),
          })),
        });
      } catch (error) {
        console.error('Failed to load analytics:', error);
        // Fallback to empty data
        setData({
          revenue_chart: [],
          licenses_chart: [],
          devices_chart: [],
        });
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [period]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold mb-2">Analytics</h2>
          <p className="text-gray-600">Visualize métricas e tendências</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod(7)}
            className={`px-4 py-2 rounded ${
              period === 7 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            7 dias
          </button>
          <button
            onClick={() => setPeriod(30)}
            className={`px-4 py-2 rounded ${
              period === 30 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            30 dias
          </button>
          <button
            onClick={() => setPeriod(90)}
            className={`px-4 py-2 rounded ${
              period === 90 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            90 dias
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Receita ao Longo do Tempo</CardTitle>
            <CardDescription>Vendas de licenças nos últimos {period} dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.revenue_chart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Receita"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Licenses Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Licenças Ativas vs Expiradas</CardTitle>
            <CardDescription>Evolução das licenças</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.licenses_chart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="active" fill="#10b981" name="Ativas" />
                <Bar dataKey="expired" fill="#ef4444" name="Expiradas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Devices Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Dispositivos Conectados</CardTitle>
            <CardDescription>Heartbeat dos últimos {period} dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.devices_chart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Dispositivos"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

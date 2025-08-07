'use client';

import { useState, useEffect } from 'react';
import { X, Send, Edit2, Trash2, Check, XCircle, Clock, Package, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PODetailModalProps {
  poId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  vendor: string;
  vendor_email: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  expected_date?: string;
  items: POItem[];
  shipping_cost?: number;
  tax_amount?: number;
  notes?: string;
  urgency_level?: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
}

interface POItem {
  productId: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost?: number;
}

interface TimelineEvent {
  date: string;
  event: string;
  user: string;
  type: 'creation' | 'approval' | 'rejection' | 'audit' | 'status_change';
  details?: any;
  reason?: string;
}

export default function PODetailModal({ poId, isOpen, onClose, onUpdate }: PODetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'timeline'>('details');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    vendor: true,
    financial: true,
    shipping: true
  });

  useEffect(() => {
    if (isOpen && poId) {
      fetchPODetails();
    }
  }, [isOpen, poId]);

  const fetchPODetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/purchase-orders/${poId}`);
      const data = await response.json();
      
      if (response.ok) {
        setPurchaseOrder(data.purchaseOrder);
        setTimeline(data.timeline || []);
      } else {
        toast.error('Failed to load purchase order details');
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
      toast.error('Failed to load purchase order details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${poId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast.success(`Status updated to ${newStatus}`);
        fetchPODetails();
        onUpdate();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleSendPO = async () => {
    if (!purchaseOrder?.vendor_email) {
      toast.error('Vendor email is required to send PO');
      return;
    }

    try {
      const response = await fetch(`/api/purchase-orders/${poId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        toast.success('Purchase order sent successfully');
        handleStatusChange('sent');
      } else {
        toast.error('Failed to send purchase order');
      }
    } catch (error) {
      toast.error('Failed to send purchase order');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit2 className="h-4 w-4" />;
      case 'pending_approval': return <Clock className="h-4 w-4" />;
      case 'approved': return <Check className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      case 'partial': return <Package className="h-4 w-4" />;
      case 'received': return <Package className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Purchase Order {purchaseOrder?.orderNumber}
            </h2>
            <div className="flex items-center space-x-3 mt-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(purchaseOrder?.status || '')}`}>
                {getStatusIcon(purchaseOrder?.status || '')}
                <span className="ml-1 capitalize">{purchaseOrder?.status}</span>
              </span>
              {purchaseOrder?.urgency_level && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(purchaseOrder.urgency_level)}`}>
                  {purchaseOrder.urgency_level} priority
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['details', 'items', 'timeline'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-3 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
                {tab === 'items' && purchaseOrder && ` (${purchaseOrder.items.length})`}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading purchase order details...</p>
            </div>
          ) : (
            <>
              {/* Details Tab */}
              {activeTab === 'details' && purchaseOrder && (
                <div className="p-6 space-y-6">
                  {/* Vendor Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <button
                      onClick={() => toggleSection('vendor')}
                      className="w-full flex justify-between items-center text-left"
                    >
                      <h3 className="text-lg font-semibold text-gray-900">Vendor Information</h3>
                      {expandedSections.vendor ? <ChevronUp /> : <ChevronDown />}
                    </button>
                    {expandedSections.vendor && (
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Vendor Name</p>
                          <p className="font-medium">{purchaseOrder.vendor}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium">{purchaseOrder.vendor_email || 'Not provided'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <button
                      onClick={() => toggleSection('financial')}
                      className="w-full flex justify-between items-center text-left"
                    >
                      <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
                      {expandedSections.financial ? <ChevronUp /> : <ChevronDown />}
                    </button>
                    {expandedSections.financial && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">
                            ${((purchaseOrder.total_amount || 0) - (purchaseOrder.shipping_cost || 0) - (purchaseOrder.tax_amount || 0)).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Shipping:</span>
                          <span className="font-medium">${(purchaseOrder.shipping_cost || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tax:</span>
                          <span className="font-medium">${(purchaseOrder.tax_amount || 0).toFixed(2)}</span>
                        </div>
                        <div className="pt-2 border-t flex justify-between">
                          <span className="text-lg font-semibold">Total:</span>
                          <span className="text-lg font-bold text-blue-600">
                            ${purchaseOrder.total_amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Shipping & Notes */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <button
                      onClick={() => toggleSection('shipping')}
                      className="w-full flex justify-between items-center text-left"
                    >
                      <h3 className="text-lg font-semibold text-gray-900">Shipping & Notes</h3>
                      {expandedSections.shipping ? <ChevronUp /> : <ChevronDown />}
                    </button>
                    {expandedSections.shipping && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <p className="text-sm text-gray-600">Expected Delivery Date</p>
                          <p className="font-medium">
                            {purchaseOrder.expected_date
                              ? new Date(purchaseOrder.expected_date).toLocaleDateString()
                              : 'Not specified'}
                          </p>
                        </div>
                        {purchaseOrder.notes && (
                          <div>
                            <p className="text-sm text-gray-600">Notes</p>
                            <p className="font-medium">{purchaseOrder.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Items Tab */}
              {activeTab === 'items' && purchaseOrder && (
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {purchaseOrder.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.sku}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">${item.unit_cost.toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                              ${(item.quantity * item.unit_cost).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <div className="p-6">
                  <div className="space-y-4">
                    {timeline.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No timeline events available</p>
                    ) : (
                      timeline.map((event, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className={`mt-1 rounded-full p-1 ${
                            event.type === 'creation' ? 'bg-blue-100' :
                            event.type === 'approval' ? 'bg-green-100' :
                            event.type === 'rejection' ? 'bg-red-100' :
                            'bg-gray-100'
                          }`}>
                            {event.type === 'creation' && <Plus className="h-4 w-4 text-blue-600" />}
                            {event.type === 'approval' && <Check className="h-4 w-4 text-green-600" />}
                            {event.type === 'rejection' && <XCircle className="h-4 w-4 text-red-600" />}
                            {event.type === 'audit' && <AlertCircle className="h-4 w-4 text-gray-600" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-900">{event.event}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(event.date).toLocaleString()}
                              </p>
                            </div>
                            <p className="text-sm text-gray-600">by {event.user}</p>
                            {event.reason && (
                              <p className="text-sm text-red-600 mt-1">Reason: {event.reason}</p>
                            )}
                            {event.details && (
                              <pre className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded">
                                {JSON.stringify(event.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions Footer */}
        {!loading && purchaseOrder && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            <div className="flex space-x-2">
              {purchaseOrder.status === 'draft' && (
                <>
                  <button
                    onClick={() => handleStatusChange('pending_approval')}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Submit for Approval
                  </button>
                  <button
                    onClick={handleSendPO}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Send to Vendor
                  </button>
                </>
              )}
              {purchaseOrder.status === 'pending_approval' && (
                <>
                  <button
                    onClick={() => handleStatusChange('approved')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleStatusChange('rejected')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Reject
                  </button>
                </>
              )}
              {purchaseOrder.status === 'approved' && (
                <button
                  onClick={handleSendPO}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Send to Vendor
                </button>
              )}
              {purchaseOrder.status === 'sent' && (
                <button
                  onClick={() => handleStatusChange('received')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Mark as Received
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
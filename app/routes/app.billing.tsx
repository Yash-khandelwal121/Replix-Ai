import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import { authenticate, GROWTH_PLAN, PRO_PLAN } from "../shopify.server";
import { db } from "../db.server";
import { useToast } from "../components/common/ToastProvider";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const shop = session.shop;

  const billingCheck = await billing.check({
    plans: [GROWTH_PLAN, PRO_PLAN],
    isTest: true,
  });

  let settings = await db.shopSettings.findUnique({ where: { shop } });
  let currentPlan = settings?.plan || "free";

  // Determine active plan from Shopify
  const activeSubscriptions = billingCheck.appSubscriptions.filter(sub => sub.status === 'ACTIVE');
  let actualShopifyPlan = "free";
  
  if (activeSubscriptions.length > 0) {
    // If somehow multiple are active, prioritize Pro
    const hasPro = activeSubscriptions.some(sub => sub.name === PRO_PLAN);
    const hasGrowth = activeSubscriptions.some(sub => sub.name === GROWTH_PLAN);
    
    if (hasPro) actualShopifyPlan = "pro";
    else if (hasGrowth) actualShopifyPlan = "growth";
  }

  // Sync DB with Shopify reality
  if (currentPlan !== actualShopifyPlan) {
    await db.shopSettings.upsert({
      where: { shop },
      create: { shop, plan: actualShopifyPlan },
      update: { plan: actualShopifyPlan }
    });
    currentPlan = actualShopifyPlan;
  }

  return json({ plan: currentPlan });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "upgrade_growth" || intent === "upgrade_pro") {
    const { session } = await authenticate.admin(request);
    
    const targetPlanName = intent === "upgrade_growth" ? GROWTH_PLAN : PRO_PLAN;
    const targetPlanSlug = intent === "upgrade_growth" ? "growth" : "pro";

    // Check if they already have the target plan on Shopify's end
    await billing.require({
      plans: [targetPlanName],
      isTest: true,
      onFailure: async () => billing.request({
        plan: targetPlanName,
        isTest: true,
      }),
    });

    // If we get here, they already have the active subscription on Shopify!
    await db.shopSettings.upsert({
      where: { shop: session.shop },
      create: { shop: session.shop, plan: targetPlanSlug },
      update: { plan: targetPlanSlug }
    });

    return json({ success: true, alreadyActive: true });
  }

  if (intent === "downgrade") {
    const { session } = await authenticate.admin(request);
    
    // Check for active subscriptions to cancel
    const billingCheck = await billing.check({
      plans: [GROWTH_PLAN, PRO_PLAN],
      isTest: true,
    });

    for (const subscription of billingCheck.appSubscriptions) {
      if (subscription.status === 'ACTIVE') {
        try {
          await billing.cancel({
            subscriptionId: subscription.id,
            isTest: true,
            prorate: true,
          });
        } catch (e) {
          console.error("Failed to cancel subscription", subscription.id, e);
        }
      }
    }

    // Downgrade in our database
    await db.shopSettings.upsert({
      where: { shop: session.shop },
      create: { shop: session.shop, plan: "free" },
      update: { plan: "free" }
    });

    return json({ success: true, downgraded: true });
  }

  return json({ success: true });
};

// Check icon component for features
const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: "2px" }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M16.7071 5.29289C17.0976 5.68342 17.0976 6.31658 16.7071 6.70711L8.70711 14.7071C8.31658 15.0976 7.68342 15.0976 7.29289 14.7071L3.29289 10.7071C2.90237 10.3166 2.90237 9.68342 3.29289 9.29289C3.68342 8.90237 4.31658 8.90237 4.70711 9.29289L8 12.5858L15.2929 5.29289C15.6834 4.90237 16.3166 4.90237 16.7071 5.29289Z" fill="#108043"/>
  </svg>
);

const CrossIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: "2px" }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L10 8.58579L13.2929 5.29289C13.6834 4.90237 14.3166 4.90237 14.7071 5.29289C15.0976 5.68342 15.0976 6.31658 14.7071 6.70711L11.4142 10L14.7071 13.2929C15.0976 13.6834 15.0976 14.3166 14.7071 14.7071C14.3166 15.0976 13.6834 15.0976 13.2929 14.7071L10 11.4142L6.70711 14.7071C6.31658 15.0976 5.68342 15.0976 5.29289 14.7071C4.90237 14.3166 4.90237 13.6834 5.29289 13.2929L8.58579 10L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z" fill="#8C9196"/>
  </svg>
);


export default function Billing() {
  const { plan } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const isUpgradingGrowth = navigation.state === "submitting" && navigation.formData?.get("intent") === "upgrade_growth";
  const isUpgradingPro = navigation.state === "submitting" && navigation.formData?.get("intent") === "upgrade_pro";
  const isDowngrading = navigation.state === "submitting" && navigation.formData?.get("intent") === "downgrade";

  // Both upgrade buttons use the exact same logic (to respect existing backend limitations)
  const handleUpgradeGrowth = () => submit({ intent: "upgrade_growth" }, { method: "post" });
  const handleUpgradePro = () => submit({ intent: "upgrade_pro" }, { method: "post" });
  const handleDowngrade = () => submit({ intent: "downgrade" }, { method: "post" });

  useEffect(() => {
    if (actionData?.alreadyActive) {
      showToast("Plan synced successfully! You are on Pro.");
      navigate("/app?upgrade=success");
    }
    if (actionData?.downgraded) {
      showToast("Downgraded to Free Plan successfully.");
    }
  }, [actionData, showToast, navigate]);

  return (
    <>
      <style>{`
        .replix-billing-page {
          font-family: -apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
          background: radial-gradient(circle at top left, #f3e7ff 0%, #e0f2fe 40%, #FAFAFA 100%);
          min-height: 100vh;
          padding: 60px 40px;
          color: #202223;
        }

        .replix-header {
          text-align: center;
          margin-bottom: 60px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .replix-header h1 {
          font-size: 44px;
          font-weight: 800;
          background: linear-gradient(135deg, #4f46e5 0%, #d946ef 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 16px 0;
          letter-spacing: -0.03em;
          line-height: 1.4;
          padding-bottom: 5px;
        }

        .replix-header p {
          font-size: 18px;
          color: #5C5F62;
          margin: 0;
          line-height: 1.5;
        }

        /* Pricing Grid */
        .replix-pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          max-width: 1100px;
          margin: 0 auto 80px auto;
        }

        /* Plan Cards */
        .replix-plan-card {
          background-color: #FFFFFF;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          border: 1px solid #F1F2F4;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .replix-plan-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
        }

        /* Growth Plan Specific styling */
        .replix-plan-recommended {
          background: linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%);
          border-color: #6366F1;
          box-shadow: 0 8px 30px rgba(99, 102, 241, 0.15);
          transform: scale(1.02);
          z-index: 2;
        }
        .replix-plan-recommended:hover {
          transform: scale(1.02) translateY(-8px);
          box-shadow: 0 20px 40px rgba(99, 102, 241, 0.25);
        }

        /* Pro Plan Specific styling */
        .replix-plan-pro {
          background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%);
          border: 1px solid #fcd34d;
        }
        .replix-plan-pro:hover {
          box-shadow: 0 16px 40px rgba(251, 191, 36, 0.15);
        }

        .replix-badge-popular {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
          color: white;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 16px;
          border-radius: 99px;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .replix-plan-name {
          font-size: 20px;
          font-weight: 700;
          color: #1A1A1A;
          margin: 0 0 8px 0;
        }

        .replix-plan-price {
          font-size: 42px;
          font-weight: 800;
          color: #1A1A1A;
          margin: 0 0 32px 0;
          display: flex;
          align-items: baseline;
        }
        .replix-plan-price span {
          font-size: 16px;
          font-weight: 500;
          color: #5C5F62;
          margin-left: 4px;
        }

        .replix-features-list {
          list-style: none;
          padding: 0;
          margin: 0 0 32px 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .replix-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 15px;
          color: #202223;
          line-height: 1.4;
        }

        /* Buttons */
        .replix-btn-pricing {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }
        
        .replix-btn-pricing:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .replix-btn-primary {
          background-color: #008060;
          color: white;
          box-shadow: 0 4px 12px rgba(0, 128, 96, 0.2);
        }
        .replix-btn-primary:hover:not(:disabled) {
          background-color: #006E52;
          box-shadow: 0 6px 16px rgba(0, 128, 96, 0.25);
        }

        .replix-btn-brand {
          background-color: #6366F1;
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        .replix-btn-brand:hover:not(:disabled) {
          background-color: #4F46E5;
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
        }

        .replix-btn-secondary {
          background-color: #F1F2F4;
          color: #202223;
          border: 1px solid #E4E5E7;
        }
        .replix-btn-secondary:hover:not(:disabled) {
          background-color: #E4E5E7;
        }

        .replix-current-plan-notice {
          margin-top: 16px;
          text-align: center;
          font-size: 13px;
          color: #5C5F62;
          line-height: 1.4;
        }

        /* Comparison Table */
        .replix-comparison-section {
          max-width: 1000px;
          margin: 0 auto 80px auto;
        }
        
        .replix-section-title {
          font-size: 28px;
          font-weight: 700;
          text-align: center;
          margin-bottom: 40px;
          color: #1A1A1A;
        }

        .replix-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          border: 1px solid #F1F2F4;
        }

        .replix-table th, .replix-table td {
          padding: 20px 24px;
          text-align: left;
          border-bottom: 1px solid #F1F2F4;
        }

        .replix-table th {
          background: #FAFAFA;
          font-size: 16px;
          font-weight: 700;
          color: #1A1A1A;
        }
        
        .replix-table th:not(:first-child), .replix-table td:not(:first-child) {
          text-align: center;
        }

        .replix-table td {
          font-size: 15px;
          color: #202223;
        }
        
        .replix-table tr:last-child td {
          border-bottom: none;
        }

        /* FAQ */
        .replix-faq-section {
          max-width: 800px;
          margin: 0 auto 80px auto;
        }

        .replix-faq-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .replix-faq-item h4 {
          font-size: 16px;
          font-weight: 700;
          color: #1A1A1A;
          margin: 0 0 8px 0;
        }

        .replix-faq-item p {
          font-size: 15px;
          color: #5C5F62;
          line-height: 1.6;
          margin: 0;
        }

        /* Trust Section */
        .replix-trust-section {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 40px;
          padding: 40px 0;
          border-top: 1px solid #E4E5E7;
          max-width: 1000px;
          margin: 0 auto;
        }

        .replix-trust-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 600;
          color: #202223;
        }

        /* Responsive */
        @media (max-width: 1000px) {
          .replix-pricing-grid { grid-template-columns: repeat(2, 1fr); }
          .replix-plan-recommended { transform: none; z-index: 1; }
          .replix-plan-recommended:hover { transform: translateY(-8px); }
          .replix-faq-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .replix-pricing-grid { grid-template-columns: 1fr; }
          .replix-header h1 { font-size: 32px; }
          .replix-table { display: block; overflow-x: auto; }
          .replix-trust-section { flex-direction: column; gap: 20px; align-items: flex-start; }
        }
      `}</style>

      <div className="replix-billing-page">
        {/* Header */}
        <div className="replix-header">
          <h1>Simple, Transparent Pricing</h1>
          <p>Choose the perfect plan for your business. Upgrade anytime as your store grows.</p>
        </div>

        {/* Pricing Cards */}
        <div className="replix-pricing-grid">
          {/* FREE PLAN */}
          <div className="replix-plan-card">
            <h2 className="replix-plan-name">FREE</h2>
            <div className="replix-plan-price">$0<span>/month</span></div>
            <ul className="replix-features-list">
              <li className="replix-feature-item"><CheckIcon/> 50 AI replies/month</li>
              <li className="replix-feature-item"><CheckIcon/> Basic Analytics</li>
              <li className="replix-feature-item"><CheckIcon/> 1 Store</li>
              <li className="replix-feature-item"><CheckIcon/> Manual Review Publishing</li>
              <li className="replix-feature-item"><CheckIcon/> Email Support</li>
            </ul>
            {plan === "free" ? (
              <>
                <button className="replix-btn-pricing replix-btn-secondary" disabled>
                  Current Replix AI Plan
                </button>
                <div className="replix-current-plan-notice">
                  This is your Replix AI subscription. Your Shopify store subscription is managed separately by Shopify.
                </div>
              </>
            ) : (
              <button className="replix-btn-pricing replix-btn-secondary" onClick={handleDowngrade} disabled={isDowngrading}>
                {isDowngrading ? "Downgrading..." : "Downgrade to Free"}
              </button>
            )}
          </div>

          {/* GROWTH PLAN */}
          <div className="replix-plan-card replix-plan-recommended">
            <div className="replix-badge-popular">MOST POPULAR</div>
            <h2 className="replix-plan-name">GROWTH</h2>
            <div className="replix-plan-price">$50<span>/month</span></div>
            <ul className="replix-features-list">
              <li className="replix-feature-item"><CheckIcon/> 500 AI replies/month</li>
              <li className="replix-feature-item"><CheckIcon/> CSV Import</li>
              <li className="replix-feature-item"><CheckIcon/> Advanced Analytics</li>
              <li className="replix-feature-item"><CheckIcon/> Judge.me Publishing</li>
              <li className="replix-feature-item"><CheckIcon/> AI Templates</li>
              <li className="replix-feature-item"><CheckIcon/> Priority Support</li>
            </ul>
            {plan === "growth" ? (
              <>
                <button className="replix-btn-pricing replix-btn-primary" disabled>
                  Current Replix AI Plan
                </button>
                <div className="replix-current-plan-notice">
                  This is your Replix AI subscription. Your Shopify store subscription is managed separately by Shopify.
                </div>
              </>
            ) : (
              <button 
                className="replix-btn-pricing replix-btn-brand" 
                onClick={handleUpgradeGrowth} 
                disabled={isUpgradingGrowth || isUpgradingPro || plan === "pro"}
              >
                {isUpgradingGrowth ? "Upgrading..." : "Upgrade to Growth"}
              </button>
            )}
          </div>

          {/* PRO PLAN */}
          <div className="replix-plan-card replix-plan-pro">
            <h2 className="replix-plan-name">PRO</h2>
            <div className="replix-plan-price">$100<span>/month</span></div>
            <ul className="replix-features-list">
              <li className="replix-feature-item"><CheckIcon/> Unlimited AI Replies</li>
              <li className="replix-feature-item"><CheckIcon/> Unlimited Stores</li>
              <li className="replix-feature-item"><CheckIcon/> Brand Voice</li>
              <li className="replix-feature-item"><CheckIcon/> Advanced Insights</li>
              <li className="replix-feature-item"><CheckIcon/> Premium Templates</li>
              <li className="replix-feature-item"><CheckIcon/> Priority Support</li>
              <li className="replix-feature-item"><CheckIcon/> Future AI Features</li>
            </ul>
            {plan === "pro" ? (
              <>
                <button className="replix-btn-pricing replix-btn-primary" disabled>
                  Current Replix AI Plan
                </button>
                <div className="replix-current-plan-notice">
                  This is your Replix AI subscription. Your Shopify store subscription is managed separately by Shopify.
                </div>
              </>
            ) : (
              <button 
                className="replix-btn-pricing replix-btn-primary" 
                onClick={handleUpgradePro} 
                disabled={isUpgradingGrowth || isUpgradingPro}
              >
                {isUpgradingPro ? "Upgrading..." : "Upgrade to Pro"}
              </button>
            )}
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="replix-comparison-section">
          <h3 className="replix-section-title">Compare Features</h3>
          <table className="replix-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Free</th>
                <th>Growth</th>
                <th>Pro</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>AI Replies</td>
                <td>50/month</td>
                <td>500/month</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Analytics</td>
                <td>Basic</td>
                <td>Advanced</td>
                <td>Advanced Insights</td>
              </tr>
              <tr>
                <td>CSV Import</td>
                <td><CrossIcon /></td>
                <td><CheckIcon /></td>
                <td><CheckIcon /></td>
              </tr>
              <tr>
                <td>Judge.me Publishing</td>
                <td><CrossIcon /></td>
                <td><CheckIcon /></td>
                <td><CheckIcon /></td>
              </tr>
              <tr>
                <td>AI Templates</td>
                <td><CrossIcon /></td>
                <td><CheckIcon /></td>
                <td>Premium</td>
              </tr>
              <tr>
                <td>Brand Voice</td>
                <td><CrossIcon /></td>
                <td><CrossIcon /></td>
                <td><CheckIcon /></td>
              </tr>
              <tr>
                <td>Priority Support</td>
                <td><CrossIcon /></td>
                <td><CheckIcon /></td>
                <td><CheckIcon /></td>
              </tr>
              <tr>
                <td>Future Features</td>
                <td><CrossIcon /></td>
                <td><CrossIcon /></td>
                <td><CheckIcon /></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* FAQ Section */}
        <div className="replix-faq-section">
          <h3 className="replix-section-title">Frequently Asked Questions</h3>
          <div className="replix-faq-grid">
            <div className="replix-faq-item">
              <h4>Can I upgrade anytime?</h4>
              <p>Yes, you can upgrade your plan at any time. The billing will be prorated automatically by Shopify.</p>
            </div>
            <div className="replix-faq-item">
              <h4>Can I cancel anytime?</h4>
              <p>Absolutely. You can downgrade to the Free plan at any time without any cancellation fees.</p>
            </div>
            <div className="replix-faq-item">
              <h4>Does Shopify handle billing?</h4>
              <p>Yes, all charges are securely processed through your existing Shopify invoice. We don't store your credit card.</p>
            </div>
            <div className="replix-faq-item">
              <h4>Are future updates included?</h4>
              <p>Yes! Our Growth and Pro plans include all future AI updates and templates automatically.</p>
            </div>
          </div>
        </div>

        {/* Trust Section */}
        <div className="replix-trust-section">
          <div className="replix-trust-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#008060" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Trusted by Shopify Merchants
          </div>
          <div className="replix-trust-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#008060" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
            Fast setup
          </div>
          <div className="replix-trust-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#008060" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Secure Shopify Billing
          </div>
          <div className="replix-trust-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#008060" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
            Cancel anytime
          </div>
          <div className="replix-trust-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#008060" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            No hidden fees
          </div>
        </div>

      </div>
    </>
  );
}

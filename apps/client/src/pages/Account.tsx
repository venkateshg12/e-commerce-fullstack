import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccountAddressesTab from "@/components/user/account/AccountAddressesTab";
import AccountProfileTab from "@/components/user/account/AccountProfileTab";
import AccountSessionsTab from "@/components/user/account/AccountSessionsTab";

const Account = () => {
  return (
    <div className="account-page-wrap">
      <div className="account-container">
        <div className="account-header">
          <h1 className="account-heading">My Account</h1>
          <p className="account-subtitle">Manage your profile, security, and saved addresses.</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="account-tabs-list">
            <TabsTrigger value="profile" className="account-tabs-trigger cursor-pointer">Profile</TabsTrigger>
            <TabsTrigger value="addresses" className="account-tabs-trigger cursor-pointer">Addresses</TabsTrigger>
            <TabsTrigger value="devices" className="account-tabs-trigger cursor-pointer">Devices</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <AccountProfileTab />
          </TabsContent>

          <TabsContent value="addresses">
            <AccountAddressesTab />
          </TabsContent>

          <TabsContent value="devices">
            <AccountSessionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Account;

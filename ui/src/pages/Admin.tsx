import FamilyMemberManager from '../components/admin/WhitelistManager'
import UserManager from '../components/admin/UserManager'

export default function Admin() {
  return (
    <div data-page>
      <header>
        <h1>Admin Dashboard</h1>
        <p>Manage users and site settings</p>
      </header>

      <div data-grid="2">
        <section>
          <FamilyMemberManager />
        </section>
        <section>
          <UserManager />
        </section>
      </div>
    </div>
  )
}

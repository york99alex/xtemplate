import { Constant } from "../../mode/constant";
import { CDOTA_BaseNPC_BZ } from "../../player/CDOTA_BaseNPC_BZ";
import { BaseModifier, registerModifier } from "../../utils/dota_ts_adapter";

@registerModifier()
export class modifier_strength extends BaseModifier {

    IsHidden(): boolean {
        return true
    }

    IsDebuff(): boolean {
        return false
    }

    IsPurgable(): boolean {
        return false
    }

    IsPurgeException(): boolean {
        return false
    }

    AllowIllusionDuplicate(): boolean {
        return false
    }

    DestroyOnExpire(): boolean {
        return false
    }

    OnStackCountChanged(stackCount: number): void {
        if (IsServer()) {
            const hParent = this.GetParent() as CDOTA_BaseNPC_BZ
            const nNewStackCount = this.GetStackCount()
            const nChanged = nNewStackCount - stackCount

            hParent.SetBaseMaxHealth(hParent.GetMaxHealth() + nChanged * Constant.ATTRIBUTE.STRENGTH_HP)

            if (hParent.GetPrimaryAttribute() == Attributes.STRENGTH) {
                const nValue = nChanged * Constant.ATTRIBUTE.PRIMARY_ATTACK_DAMAGE
                hParent.SetBaseDamageMax(hParent.GetBaseDamageMax() + nValue)
                hParent.SetBaseDamageMin(hParent.GetBaseDamageMin() + nValue)
            }
        }
    }

    DeclareFunctions(): ModifierFunction[] {
        return [
            ModifierFunction.HEALTH_REGEN_CONSTANT,
            // ModifierFunction.HEALTH_BONUS
        ]
    }

    // GetModifierConstantHealthRegen(): number {
    //     return Constant.ATTRIBUTE.STRENGTH_HP_REGEN * this.GetStackCount()
    // }

    GetAttributes(): ModifierAttribute {
        return ModifierAttribute.MULTIPLE
    }

}